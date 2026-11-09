import { randomUUID } from "node:crypto";
import { NodeRedisTransport } from "../../platform/redis/node-redis.transport";
import { ResilientRedis } from "../../platform/redis/resilient-redis";
import { CacheAside } from "../../platform/redis/cache-aside";
import { DomainEvents } from "../../platform/redis/domain-events";

const url = process.env.TEST_REDIS_URL;
if (url && !/\/(1[0-5])$/.test(new URL(url).pathname)) throw new Error("TEST_REDIS_URL must use isolated DB 10-15.");
const integration = url ? describe : describe.skip;
integration("Redis real (sem FLUSHDB)", () => {
  const prefix = `schedra-test:${randomUUID()}`;
  const transport = new NodeRedisTransport(url!, 1000);
  const redis = new ResilientRedis(transport, { enabled: true, timeoutMs: 2000, failureThreshold: 2, cooldownMs: 50 });
  const cache = new CacheAside(redis, prefix, 1);
  const valid = (value: unknown): value is { value: number } => typeof (value as { value?: number })?.value === "number";
  afterAll(async () => {
    // The dedicated test prefix is the only data this suite removes.
    await redis.execute(async command => {
      const keys = await command(["KEYS", `${prefix}:*`]) as string[];
      if (keys.length) await command(["DEL", ...keys]);
    });
    await transport.close();
  });
  it("miss/hit, TTL e invalidacao em Redis real", async () => {
    const load = jest.fn(async () => ({ value: 1 }));
    await cache.read("org:1", { page: 1 }, load, valid);
    await cache.read("org:1", { page: 1 }, load, valid);
    expect(load).toHaveBeenCalledTimes(1);
    await cache.invalidate("org:1");
    await cache.read("org:1", { page: 1 }, load, valid);
    expect(load).toHaveBeenCalledTimes(2);
    await new Promise(resolve => setTimeout(resolve, 1100));
    await cache.read("org:1", { page: 1 }, load, valid);
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("publicador e assinante separados correlacionam eventId", async () => {
    const records: Record<string, string | number>[] = [];
    let receivedMessage: unknown;
    let received!: () => void;
    const consumed = new Promise<void>(resolve => { received = resolve; });
    const events = new DomainEvents(redis, `${prefix}:events`, record => records.push(record));
    await transport.subscribe(`${prefix}:events`, message => { receivedMessage = JSON.parse(message); received(); });
    await events.publish("client.updated", "org:1", 5);
    await Promise.race([consumed, new Promise((_resolve, reject) => setTimeout(() => reject(new Error("No consumption")), 2000).unref())]);
    expect(receivedMessage).toMatchObject({
      eventId: records.find(record => record.type === "event_published")?.eventId,
      version: 1, type: "client.updated", scope: "org:1", entityId: 5,
    });
  });
  it("rajada de leituras identicas compartilha um SELECT com Redis real", async () => {
    const load = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { value: 7 };
    });
    const values = await Promise.all(Array.from({ length: 20 }, () =>
      cache.read("org:burst", { page: 1 }, load, valid)));
    expect(load).toHaveBeenCalledTimes(1);
    expect(values).toEqual(Array.from({ length: 20 }, () => ({ value: 7 })));
  });
});
