import { createClient } from "redis";
import { RedisTransport } from "./resilient-redis";
import { countInfrastructure } from "./telemetry";

const newConnection = (url: string, timeoutMs: number, reconnect: boolean) => createClient({
  url, disableOfflineQueue: true, commandsQueueMaxLength: 64,
  socket: { connectTimeout: timeoutMs, reconnectStrategy: reconnect
    ? (retries: number) => Math.min(500 * 2 ** Math.min(retries, 4), 5000) : false },
});

export class NodeRedisTransport implements RedisTransport {
  private client: ReturnType<typeof newConnection> | undefined;
  private connecting: Promise<void> | undefined;
  private subscriber: ReturnType<typeof newConnection> | undefined;
  constructor(private readonly url: string, private readonly timeoutMs: number) {}

  public async command(args: string[], signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    if (!this.client) {
      const client = newConnection(this.url, this.timeoutMs, false);
      client.on("error", () => countInfrastructure("redis", "connection_error"));
      client.on("end", () => { if (this.client === client) this.client = undefined; });
      this.client = client;
      this.connecting = client.connect().then(() => undefined).catch(error => {
        if (this.client === client) this.client = undefined;
        if (client.isOpen) client.destroy();
        throw error;
      });
    }
    const client = this.client;
    const abort = () => {
      if (this.client === client) this.client = undefined;
      if (client.isOpen) client.destroy();
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      await this.connecting;
      signal.throwIfAborted();
      return await client.sendCommand(args, { abortSignal: signal });
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }

  public async subscribe(channel: string, listener: (message: string) => void): Promise<void> {
    if (this.subscriber) return;
    const client = newConnection(this.url, this.timeoutMs, true);
    client.on("error", () => countInfrastructure("events", "subscriber_error"));
    this.subscriber = client;
    // node-redis restores subscriptions on reconnect; this socket never runs cache commands.
    await client.connect();
    await client.subscribe(channel, listener);
  }

  public async close(): Promise<void> {
    for (const client of [this.client, this.subscriber]) if (client?.isOpen) client.destroy();
    this.client = undefined;
    this.subscriber = undefined;
    this.connecting = undefined;
  }
}
