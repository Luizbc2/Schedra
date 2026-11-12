export type Config = {
  port: number; redisUrl: string; channel: string; databasePath: string;
  metricsToken: string; retentionDays: number;
};
function integer(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid numeric configuration');
  return value;
}
export function readConfig(env: NodeJS.ProcessEnv): Config {
  const redisUrl = env.REDIS_URL || '';
  let url: URL;
  try { url = new URL(redisUrl); } catch { throw new Error('REDIS_URL is required'); }
  if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname || url.hash)
    throw new Error('Invalid Redis configuration');
  const metricsToken = env.EVENTS_METRICS_TOKEN || '';
  if (metricsToken.length < 32 || metricsToken.length > 256 || !/^[\x21-\x7e]+$/.test(metricsToken))
    throw new Error('Dedicated operational token must have 32-256 printable characters');
  const channel = env.EVENTS_CHANNEL || 'schedra:v1:events:v1';
  if (!/^[a-zA-Z0-9:_-]{1,120}$/.test(channel)) throw new Error('Invalid channel');
  return {
    port: integer(env.PORT, 3334, 1, 65535), redisUrl, channel,
    databasePath: env.EVENTS_DB_PATH || './data/activity.sqlite', metricsToken,
    retentionDays: integer(env.EVENTS_RETENTION_DAYS, 30, 1, 365),
  };
}
