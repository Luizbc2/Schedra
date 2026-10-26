import { randomUUID } from "node:crypto";
import { getRequestContext } from "../../shared/http/request-context";
import { RedisTransport, ResilientRedis } from "./resilient-redis";
import { countInfrastructure, infrastructureLog, InfrastructureLog } from "./telemetry";

export type ClientEventType = "client.created" | "client.updated" | "client.deleted";
export type DomainEvent = { eventId: string; version: 1; type: ClientEventType; scope: string; entityId: number; occurredAt: string; requestId: string };
const eventTypes = new Set(["client.created", "client.updated", "client.deleted"]);
export class DomainEvents {
  constructor(private readonly redis: ResilientRedis, private readonly transport: RedisTransport,
    private readonly channel: string, private readonly log: InfrastructureLog = infrastructureLog) {}

  public async publish(type: ClientEventType, scope: string, entityId: number): Promise<void> {
    const event: DomainEvent = { eventId: randomUUID(), version: 1, type, scope, entityId,
      occurredAt: new Date().toISOString(), requestId: getRequestContext()?.requestId ?? randomUUID() };
    const result = await this.redis.execute(command => command(["PUBLISH", this.channel, JSON.stringify(event)]));
    countInfrastructure("events", result.available ? "published" : "publish_failed");
    this.log({ type: result.available ? "event_published" : "event_publish_failed", eventId: event.eventId,
      eventType: event.type, requestId: event.requestId, subscribers: result.available ? Number(result.value) : 0 });
  }

  public async start(): Promise<void> { await this.transport.subscribe(this.channel, message => this.consume(message)); }
  public consume(message: string): void {
    try {
      if (Buffer.byteLength(message) > 4096) throw new Error("Event too large");
      const value = JSON.parse(message) as Partial<DomainEvent>;
      if (value.version !== 1 || !eventTypes.has(value.type ?? "") ||
        !/^[0-9a-f-]{36}$/i.test(value.eventId ?? "") || !/^(org|user):[1-9][0-9]*$/.test(value.scope ?? "") ||
        !Number.isSafeInteger(value.entityId) || Number(value.entityId) <= 0 ||
        typeof value.requestId !== "string" || value.requestId.length > 128 ||
        typeof value.occurredAt !== "string" || !Number.isFinite(Date.parse(value.occurredAt))) throw new Error("Invalid event");
      countInfrastructure("events", "consumed");
      this.log({ type: "event_consumed", eventId: value.eventId!, eventType: value.type!, requestId: value.requestId });
    } catch { countInfrastructure("events", "invalid"); }
  }
}
