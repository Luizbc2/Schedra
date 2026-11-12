import type { AuthOrganization, AuthUser, AccountType } from "../../features/auth/types";
import type { Client } from "../../features/catalog/api/clients-api";
import type { Professional } from "../../features/catalog/api/professionals-api";
import type { Service } from "../../features/catalog/api/services-api";
import type { Appointment, PersonalEvent } from "../../features/agenda/api/agenda-api";

export type SyncStatus = "synced" | "pending" | "conflict";
export type Scope = { id: string; userId: number; organizationId: number | null; mode: AccountType | "account" };
export type RecordMetadata = {
  id: string;
  scopeId: string;
  remoteId: number | null;
  remoteVersion: number | null;
  syncStatus: SyncStatus;
  updatedAt: number;
  deletedAt: number | null;
};
export type RemoteEntities = {
  clients: Client;
  professionals: Professional;
  services: Service;
  appointments: Appointment;
  personal_events: PersonalEvent;
};
export type EntityRows = { [K in keyof RemoteEntities]: RecordMetadata & Omit<RemoteEntities[K], "id" | "version"> };
export type EntityTable = keyof EntityRows;
export type OutboxRow = {
  id: string;
  scopeId: string;
  entityType: EntityTable | "avatar";
  entityId: string;
  action: "create" | "update" | "delete";
  payload: string;
  mediaId: string | null;
  baseVersion: number | null;
  dependencyId: string | null;
  attempts: number;
  nextAttemptAt: number;
  status: "pending" | "blocked";
  lastError: string | null;
  createdAt: number;
};
export type MediaRow = {
  id: string;
  scopeId: string;
  ownerId: number;
  content: Uint8Array;
  mimeType: string;
  byteSize: number;
  checksum: string;
  width: number;
  height: number;
  remoteUrl: string | null;
  syncStatus: SyncStatus;
  createdAt: number;
  updatedAt: number;
};
export type StoredProfileRow = Omit<AuthUser, "id"> & { id: string; userId: number; scopeId: string; organizationJson: string | null };
export type Tables = EntityRows & {
  scopes: Scope;
  profiles: StoredProfileRow;
  preferences: { id: string; scopeId: string; value: string };
  media_assets: MediaRow;
  outbox: OutboxRow;
  sync_state: { id: string; scopeId: string; resource: string; recordIds: string; updatedAt: number };
};
export type TableName = keyof Tables;

export interface LocalTransaction {
  get<T extends TableName>(table: T, id: string): Promise<Tables[T] | null>;
  all<T extends TableName>(table: T, scopeId?: string): Promise<Tables[T][]>;
  put<T extends TableName>(table: T, row: Tables[T]): Promise<void>;
  remove(table: TableName, id: string): Promise<void>;
  removeScope(scopeId: string): Promise<void>;
}
export interface LocalDatabase {
  read<T>(work: (tx: LocalTransaction) => Promise<T>): Promise<T>;
  write<T>(work: (tx: LocalTransaction) => Promise<T>): Promise<T>;
}
export type PersistedSession = {
  token: string;
  refreshToken?: string;
  user: AuthUser;
  organization?: AuthOrganization;
  workspaceMode: AccountType;
};
