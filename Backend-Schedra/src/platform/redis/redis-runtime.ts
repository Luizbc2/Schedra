import { env } from "../../config/env";
import { CacheAside } from "./cache-aside";
import { DomainEvents } from "./domain-events";
import { NodeRedisTransport } from "./node-redis.transport";
import { ResilientRedis } from "./resilient-redis";

const transport = new NodeRedisTransport(env.redis.url, env.redis.timeoutMs);
const redis = new ResilientRedis(transport, { ...env.redis, enabled: Boolean(env.redis.url) });
export const clientCache = new CacheAside(redis, env.redis.prefix, env.redis.ttlSeconds);
export const clientEvents = new DomainEvents(redis, transport, `${env.redis.prefix}:events:v1`);
export const startRedisSubscriber = (): void => {
  if (env.redis.url) void clientEvents.start().catch(() => undefined);
};
export const closeRedis = (): Promise<void> => transport.close();
