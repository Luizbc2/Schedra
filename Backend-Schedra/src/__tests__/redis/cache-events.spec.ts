import { CacheAside } from "../../platform/redis/cache-aside";
import { DomainEvents } from "../../platform/redis/domain-events";
import { RedisTransport, ResilientRedis } from "../../platform/redis/resilient-redis";
import { CachedClientRepository } from "../../modules/clients/repositories/cached-client.repository";
import { ClientRepository } from "../../modules/clients/repositories/client.repository";
import { runWithRequestContext } from "../../shared/http/request-context";

class FakeRedis implements RedisTransport {
  rows = new Map<string, { value: string; expires?: number }>();
  time = 0;
  down = false;
  listener?: (message: string) => void;
  calls: string[][] = [];
  async command(args: string[]): Promise<unknown> {
    this.calls.push(args);
    if (this.down) throw new Error("secret connection error must not be logged");
    const [op, key, value, mode, ttl] = args;
    if (op === "SET") {
      if (mode === "NX" && this.rows.has(key)) return null;
      this.rows.set(key, { value, expires: mode === "EX" ? this.time + Number(ttl) * 1000 : undefined });
      return "OK";
    }
    if (op === "GET") {
      const row = this.rows.get(key);
      if (row?.expires !== undefined && row.expires <= this.time) { this.rows.delete(key); return null; }
      return row?.value ?? null;
    }
    if (op === "EVAL") {
      const [, , , revisionKey, dataKey, revision, encoded, seconds] = args;
      if (this.rows.get(revisionKey)?.value !== revision) return null;
      this.rows.set(dataKey, { value: encoded, expires: this.time + Number(seconds) * 1000 });
      return "OK";
    }
    if (op === "PUBLISH") { this.listener?.(value); return this.listener ? 1 : 0; }
    throw new Error("Unsupported test command");
  }
  async subscribe(_channel: string, listener: (message: string) => void) { this.listener = listener; }
  async close() {}
}
const policy = { enabled: true, timeoutMs: 50, failureThreshold: 2, cooldownMs: 1000 };
const valid = (value: unknown): value is { items: string[] } => !!value && Array.isArray((value as { items?: unknown }).items);
const query = { page: 1, limit: 6, search: "" };
const setup = () => {
  const transport = new FakeRedis();
  const log = jest.fn();
  const redis = new ResilientRedis(transport, policy, log, () => transport.time);
  return { transport, log, redis, cache: new CacheAside(redis, "test", 1) };
};

describe("Redis cache-aside", () => {
  it("miss, hit e TTL; termos de busca nao aparecem nas chaves", async () => {
    const { cache, transport } = setup();
    const load = jest.fn(async () => ({ items: ["atual"] }));
    const parameters = { search: "nome-confidencial", page: 1 };
    await cache.read("user:1", parameters, load, valid);
    await cache.read("user:1", parameters, load, valid);
    expect(load).toHaveBeenCalledTimes(1);
    expect([...transport.rows.keys()].join()).not.toContain("nome-confidencial");
    transport.time = 1001;
    await cache.read("user:1", parameters, load, valid);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("isola escopos, paginas e buscas; invalidacao cobre todas as variantes", async () => {
    const { cache } = setup();
    const load = jest.fn(async () => ({ items: [] }));
    for (const scope of ["user:1", "org:1", "org:2"]) {
      for (const page of [1, 2]) await cache.read(scope, { page }, load, valid);
    }
    expect(load).toHaveBeenCalledTimes(6);
    await cache.invalidate("org:1");
    for (const scope of ["user:1", "org:1", "org:2"]) {
      for (const page of [1, 2]) await cache.read(scope, { page }, load, valid);
    }
    expect(load).toHaveBeenCalledTimes(8);
  });
  it("nao republica leitura antiga quando escrita invalida durante o SELECT", async () => {
    const { cache } = setup();
    let release!: (value: { items: string[] }) => void;
    const delayed = new Promise<{ items: string[] }>(resolve => { release = resolve; });
    let started!: () => void;
    const loading = new Promise<void>(resolve => { started = resolve; });
    const old = cache.read("org:1", query, async () => { started(); return delayed; }, valid);
    await loading;
    await cache.invalidate("org:1");
    release({ items: ["old"] });
    await old;
    expect(await cache.read("org:1", query, async () => ({ items: ["new"] }), valid)).toEqual({ items: ["new"] });
  });
  it("corrupto ou indisponivel usa banco; erro do banco continua visivel", async () => {
    const { cache, transport } = setup();
    transport.down = true;
    expect(await cache.read("user:1", query, async () => ({ items: ["db"] }), valid)).toEqual({ items: ["db"] });
    await expect(cache.read("user:1", query, async () => { throw new Error("DB down"); }, valid)).rejects.toThrow("DB down");
  });
  it("deadline cancela comando e breaker abre, evita repeticao e recupera", async () => {
    const { redis, transport, log } = setup();
    transport.down = true;
    await redis.execute(command => command(["GET", "x"]));
    await redis.execute(command => command(["GET", "x"]));
    const calls = transport.calls.length;
    expect((await redis.execute(command => command(["GET", "x"])) ).available).toBe(false);
    expect(transport.calls).toHaveLength(calls);
    transport.down = false;
    transport.time = 1001;
    expect((await redis.execute(command => command(["GET", "x"])) ).available).toBe(true);
    expect(log.mock.calls.flat().map(value => JSON.stringify(value)).join()).not.toContain("secret");
    let signal!: AbortSignal;
    const hanging: RedisTransport = { command: async (_args, current) => { signal = current; return new Promise(() => {}); }, subscribe: async () => {}, close: async () => {} };
    const bounded = new ResilientRedis(hanging, { ...policy, timeoutMs: 5 });
    expect((await bounded.execute(command => command(["GET", "x"])) ).available).toBe(false);
    expect(signal.aborted).toBe(true);
  });
});

describe("Efeitos de clientes e eventos", () => {
  const client = { id: 1, name: "Teste", email: "", phone: "", cpf: "", notes: "" };
  it("publica e consome envelope correlacionado sem dados pessoais", async () => {
    const { redis, transport, log } = setup();
    const events = new DomainEvents(redis, transport, "test:events", log);
    await events.start();
    await runWithRequestContext({ requestId: "request-123" }, () => events.publish("client.created", "org:1", 1));
    const records = log.mock.calls.map(call => call[0]);
    const published = records.find(record => record.type === "event_published");
    const consumed = records.find(record => record.type === "event_consumed");
    expect(published.eventId).toBe(consumed.eventId);
    expect(consumed.requestId).toBe("request-123");
    expect(transport.calls.find(args => args[0] === "PUBLISH")![2]).not.toMatch(/email|cpf|name|phone/);
    events.consume('{"version":99}');
    expect(log.mock.calls).toHaveLength(2);
  });
  it("efeitos so apos escrita confirmada; nenhuma invalidacao em update inexistente", async () => {
    const { cache, redis, transport } = setup();
    const events = new DomainEvents(redis, transport, "test:events");
    const source: ClientRepository = { findById: jest.fn(), list: jest.fn(), create: jest.fn(async () => client), update: jest.fn(async () => null), delete: jest.fn(async () => false) };
    const invalidated = jest.spyOn(cache, "invalidate");
    const published = jest.spyOn(events, "publish");
    const repository = new CachedClientRepository(source, cache, events);
    await runWithRequestContext({ organizationId: 7 }, () => repository.create(5, client));
    expect(invalidated).toHaveBeenCalledWith("org:7");
    expect(published).toHaveBeenCalledWith("client.created", "org:7", 1);
    await repository.update(5, 99, client);
    await repository.delete(5, 99);
    expect(invalidated).toHaveBeenCalledTimes(1);
    (source.create as jest.Mock).mockRejectedValueOnce(new Error("write failed"));
    await expect(repository.create(5, client)).rejects.toThrow("write failed");
    expect(published).toHaveBeenCalledTimes(1);
    transport.down = true;
    expect(await repository.create(5, client)).toEqual(client);
  });
});
