export const eventTypes = ['client.created', 'client.updated', 'client.deleted'] as const;
export type ClientEventType = typeof eventTypes[number];
export type ClientEvent = {
  eventId: string;
  version: 1;
  type: ClientEventType;
  scope: string;
  entityId: number;
  occurredAt: string;
  requestId: string;
};
const keys = new Set(['eventId', 'version', 'type', 'scope', 'entityId', 'occurredAt', 'requestId']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseClientEvent(message: string): ClientEvent | null {
  if (Buffer.byteLength(message) > 4096) return null;
  let value: unknown;
  try { value = JSON.parse(message); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== keys.size || Object.keys(row).some(key => !keys.has(key))
    || row.version !== 1 || typeof row.type !== 'string'
    || !eventTypes.some(type => type === row.type)
    || typeof row.eventId !== 'string' || !uuid.test(row.eventId)
    || typeof row.scope !== 'string' || !/^(org|user):[1-9][0-9]*$/.test(row.scope)
    || typeof row.entityId !== 'number' || !Number.isSafeInteger(row.entityId) || row.entityId <= 0
    || typeof row.requestId !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(row.requestId)
    || typeof row.occurredAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.occurredAt)
    || !Number.isFinite(Date.parse(row.occurredAt))
    || new Date(row.occurredAt).toISOString() !== row.occurredAt) return null;
  return {
    eventId: row.eventId.toLowerCase(), version: 1, type: row.type as ClientEventType,
    scope: row.scope, entityId: row.entityId,
    occurredAt: new Date(row.occurredAt).toISOString(), requestId: row.requestId,
  };
}
