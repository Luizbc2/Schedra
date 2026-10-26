import { createHash, randomUUID } from "node:crypto";
import { ResilientRedis } from "./resilient-redis";
import { countInfrastructure } from "./telemetry";

const guardedSet = "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3]) end return nil";
export class CacheAside {
  constructor(private readonly redis: ResilientRedis, private readonly prefix: string, private readonly ttlSeconds = 30) {}
  private revisionKey(scope: string): string { return `${this.prefix}:clients:${scope}:revision`; }

  public async read<T>(scope: string, parameters: object, load: () => Promise<T>, valid: (value: unknown) => value is T): Promise<T> {
    const revisionKey = this.revisionKey(scope);
    const hash = createHash("sha256").update(JSON.stringify(parameters)).digest("hex");
    const cached = await this.redis.execute(async command => {
      await command(["SET", revisionKey, randomUUID(), "NX"]);
      const revision = await command(["GET", revisionKey]);
      if (typeof revision !== "string") throw new Error("Missing cache revision");
      const key = `${this.prefix}:clients:${scope}:${revision}:${hash}`;
      const raw = await command(["GET", key]);
      let value: unknown;
      if (typeof raw === "string") { try { value = JSON.parse(raw); } catch { countInfrastructure("cache", "invalid"); } }
      return { revision, key, value };
    });
    if (cached.available && valid(cached.value.value)) {
      countInfrastructure("cache", "hit");
      return cached.value.value;
    }
    countInfrastructure("cache", cached.available ? "miss" : "bypass");
    const fresh = await load();
    if (cached.available) {
      const encoded = JSON.stringify(fresh);
      if (Buffer.byteLength(encoded) <= 512 * 1024) {
        const { revision, key } = cached.value;
        await this.redis.execute(command => command(["EVAL", guardedSet, "2", revisionKey, key, revision, encoded, String(this.ttlSeconds)]));
      }
    }
    return fresh;
  }

  public async invalidate(scope: string): Promise<void> {
    const result = await this.redis.execute(command => command(["SET", this.revisionKey(scope), randomUUID()]));
    countInfrastructure("cache", result.available ? "invalidated" : "invalidation_failed");
  }
}
