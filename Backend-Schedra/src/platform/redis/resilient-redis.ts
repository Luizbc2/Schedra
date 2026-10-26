import { countInfrastructure, infrastructureLog, InfrastructureLog } from "./telemetry";

export interface RedisTransport {
  command(args: string[], signal: AbortSignal): Promise<unknown>;
  subscribe(channel: string, listener: (message: string) => void): Promise<void>;
  close(): Promise<void>;
}
export type RedisResult<T> = { available: true; value: T } | { available: false };
export type RedisPolicy = { enabled: boolean; timeoutMs: number; failureThreshold: number; cooldownMs: number };

export class ResilientRedis {
  private failures = 0;
  private openUntil = 0;
  private probing = false;
  private generation = 0;
  constructor(
    private readonly transport: RedisTransport,
    private readonly policy: RedisPolicy,
    private readonly log: InfrastructureLog = infrastructureLog,
    private readonly now: () => number = Date.now,
  ) {}

  public async execute<T>(operation: (command: (args: string[]) => Promise<unknown>) => Promise<T>): Promise<RedisResult<T>> {
    if (!this.policy.enabled) return { available: false };
    if (this.openUntil > this.now() || this.probing) {
      countInfrastructure("redis", "circuit_open");
      return { available: false };
    }
    const probe = this.openUntil !== 0;
    const generation = this.generation;
    if (probe) this.probing = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Redis deadline exceeded")); }, this.policy.timeoutMs);
      });
      const value = await Promise.race([
        operation(args => this.transport.command(args, controller.signal)), timeout,
      ]);
      if (generation === this.generation) {
        if (probe) { this.log({ type: "redis_circuit", state: "closed" }); this.generation += 1; }
        this.failures = 0;
        this.openUntil = 0;
      }
      countInfrastructure("redis", "success");
      return { available: true, value };
    } catch {
      if (generation === this.generation) this.failures += 1;
      if (generation === this.generation && (this.failures >= this.policy.failureThreshold || probe)) {
        this.openUntil = this.now() + this.policy.cooldownMs;
        this.generation += 1;
        this.log({ type: "redis_circuit", state: "open" });
      }
      countInfrastructure("redis", "unavailable");
      return { available: false };
    } finally {
      clearTimeout(timer);
      if (probe) this.probing = false;
    }
  }
}
