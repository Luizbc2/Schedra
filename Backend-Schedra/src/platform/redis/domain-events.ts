import { randomUUID } from "node:crypto";
import { getRequestContext } from "../../shared/http/request-context";
import { ResilientRedis } from "./resilient-redis";
import { countInfrastructure, infrastructureLog, InfrastructureLog } from "./telemetry";

export type ClientEventType = "client.created" | "client.updated" | "client.deleted";
export type DomainEvent = { eventId: string; version: 1; type: ClientEventType; scope: string; entityId: number; occurredAt: string; requestId: string };
export class DomainEvents {
  constructor(private readonly redis: ResilientRedis,
    private readonly channel: string, private readonly log: InfrastructureLog = infrastructureLog) {}

  public async publish(type: ClientEventType, scope: string, entityId: number): Promise<void> {
    const event: DomainEvent = { eventId: randomUUID(), version: 1, type, scope, entityId,
      occurredAt: new Date().toISOString(), requestId: getRequestContext()?.requestId ?? randomUUID() };
    const result = await this.redis.execute(command => command(["PUBLISH", this.channel, JSON.stringify(event)]));
    countInfrastructure("events", result.available ? "published" : "publish_failed");
    this.log({ type: result.available ? "event_published" : "event_publish_failed", eventId: event.eventId,
      eventType: event.type, requestId: event.requestId, subscribers: result.available ? Number(result.value) : 0 });
  }

}
