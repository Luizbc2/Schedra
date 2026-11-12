import type { TableName } from "./types";

export const DATABASE_VERSION = 1;
const metadata = `id TEXT PRIMARY KEY NOT NULL, scopeId TEXT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  remoteId INTEGER, remoteVersion INTEGER, syncStatus TEXT NOT NULL CHECK(syncStatus IN ('synced','pending','conflict')),
  updatedAt INTEGER NOT NULL, deletedAt INTEGER`;
const uniqueRemote = "UNIQUE(scopeId, remoteId), UNIQUE(id, scopeId)";

export const schemaSql = `
CREATE TABLE scopes (id TEXT PRIMARY KEY NOT NULL, userId INTEGER NOT NULL, organizationId INTEGER, mode TEXT NOT NULL);
CREATE TABLE profiles (id TEXT PRIMARY KEY NOT NULL, scopeId TEXT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  userId INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, cpf TEXT NOT NULL,
  accountType TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL, avatarUrl TEXT, organizationJson TEXT);
CREATE TABLE preferences (id TEXT PRIMARY KEY NOT NULL, scopeId TEXT NOT NULL, value TEXT NOT NULL);
CREATE TABLE clients (${metadata}, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, cpf TEXT NOT NULL, notes TEXT NOT NULL, ${uniqueRemote});
CREATE TABLE professionals (${metadata}, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, specialty TEXT NOT NULL, status TEXT NOT NULL, ${uniqueRemote});
CREATE TABLE services (${metadata}, name TEXT NOT NULL, category TEXT NOT NULL, durationMinutes INTEGER NOT NULL, price REAL NOT NULL, description TEXT NOT NULL, ${uniqueRemote});
CREATE TABLE personal_events (${metadata}, title TEXT NOT NULL, startsAt TEXT NOT NULL, endsAt TEXT NOT NULL, location TEXT NOT NULL,
  notes TEXT NOT NULL, reminderMinutes INTEGER NOT NULL, completed INTEGER NOT NULL, ${uniqueRemote});
CREATE TABLE appointments (${metadata}, clientId INTEGER NOT NULL, clientName TEXT NOT NULL, professionalId INTEGER NOT NULL, professionalName TEXT NOT NULL,
  serviceId INTEGER NOT NULL, serviceName TEXT NOT NULL, scheduledAt TEXT NOT NULL, endsAt TEXT NOT NULL, durationMinutes INTEGER NOT NULL,
  priceSnapshot REAL NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL, ${uniqueRemote});
CREATE TABLE media_assets (id TEXT PRIMARY KEY NOT NULL, scopeId TEXT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE, ownerId INTEGER NOT NULL,
  content BLOB NOT NULL, mimeType TEXT NOT NULL, byteSize INTEGER NOT NULL CHECK(byteSize > 0 AND byteSize <= 5242880),
  checksum TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, remoteUrl TEXT, syncStatus TEXT NOT NULL,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, UNIQUE(id, scopeId));
CREATE TABLE outbox (id TEXT PRIMARY KEY NOT NULL, scopeId TEXT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  entityType TEXT NOT NULL, entityId TEXT NOT NULL, action TEXT NOT NULL, payload TEXT NOT NULL, mediaId TEXT,
  baseVersion INTEGER, dependencyId TEXT, attempts INTEGER NOT NULL DEFAULT 0, nextAttemptAt INTEGER NOT NULL,
  status TEXT NOT NULL, lastError TEXT, createdAt INTEGER NOT NULL,
  FOREIGN KEY (mediaId, scopeId) REFERENCES media_assets(id, scopeId));
CREATE TABLE sync_state (id TEXT PRIMARY KEY NOT NULL, scopeId TEXT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  resource TEXT NOT NULL, recordIds TEXT NOT NULL, updatedAt INTEGER NOT NULL);
CREATE INDEX scopes_user ON scopes(userId);
CREATE INDEX profiles_scope ON profiles(scopeId);
CREATE INDEX preferences_scope ON preferences(scopeId);
CREATE INDEX clients_scope_name ON clients(scopeId, name);
CREATE INDEX professionals_scope_name ON professionals(scopeId, name);
CREATE INDEX services_scope_name ON services(scopeId, name);
CREATE INDEX personal_events_scope_date ON personal_events(scopeId, startsAt);
CREATE INDEX appointments_scope_date ON appointments(scopeId, scheduledAt);
CREATE INDEX media_scope ON media_assets(scopeId, updatedAt);
CREATE INDEX outbox_ready ON outbox(scopeId, status, nextAttemptAt);
CREATE INDEX sync_scope ON sync_state(scopeId, resource);
`;

const base = ["id", "scopeId", "remoteId", "remoteVersion", "syncStatus", "updatedAt", "deletedAt"];
export const tableColumns: Record<TableName, readonly string[]> = {
  scopes: ["id", "userId", "organizationId", "mode"],
  profiles: ["id", "scopeId", "userId", "name", "email", "cpf", "accountType", "role", "active", "avatarUrl", "organizationJson"],
  preferences: ["id", "scopeId", "value"],
  clients: [...base, "name", "email", "phone", "cpf", "notes"],
  professionals: [...base, "name", "email", "phone", "specialty", "status"],
  services: [...base, "name", "category", "durationMinutes", "price", "description"],
  appointments: [...base, "clientId", "clientName", "professionalId", "professionalName", "serviceId", "serviceName", "scheduledAt", "endsAt", "durationMinutes", "priceSnapshot", "status", "notes"],
  personal_events: [...base, "title", "startsAt", "endsAt", "location", "notes", "reminderMinutes", "completed"],
  media_assets: ["id", "scopeId", "ownerId", "content", "mimeType", "byteSize", "checksum", "width", "height", "remoteUrl", "syncStatus", "createdAt", "updatedAt"],
  outbox: ["id", "scopeId", "entityType", "entityId", "action", "payload", "mediaId", "baseVersion", "dependencyId", "attempts", "nextAttemptAt", "status", "lastError", "createdAt"],
  sync_state: ["id", "scopeId", "resource", "recordIds", "updatedAt"],
};
export const tableNames = Object.keys(tableColumns) as TableName[];
export const scopedTables = tableNames.filter((name) => name !== "scopes");
