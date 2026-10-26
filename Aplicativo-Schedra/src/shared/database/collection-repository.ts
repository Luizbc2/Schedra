import type { EntityTable, LocalDatabase, Scope, RemoteEntities, Tables } from "./types";

type RemoteRow<T extends EntityTable> = RemoteEntities[T];
type Guard = () => void;
const noGuard = () => {};
const recordId = (scope: Scope, table: EntityTable, remoteId: number) => `${scope.id}:${table}:${remoteId}`;
const snapshotId = (scope: Scope, table: EntityTable, query: string) => `${scope.id}:${table}:query:${query.trim().toLocaleLowerCase("pt-BR")}`;

export function createCollectionRepository<T extends EntityTable>(database: () => Promise<LocalDatabase>, table: T) {
  return {
    async saveRemote(scope: Scope, records: RemoteRow<T>[], query = "", guard: Guard = noGuard) {
      const db = await database();
      const updatedAt = Date.now();
      await db.write(async (tx) => {
        guard();
        await tx.put("scopes", scope);
        const ids: string[] = [];
        for (const record of records) {
          const id = recordId(scope, table, record.id);
          ids.push(id);
          const existing = await tx.get(table, id);
          if (existing && existing.syncStatus !== "synced") continue;
          const { id: remoteId, version, ...data } = record as RemoteRow<T> & { version?: number };
          await tx.put(table, { ...data, id, scopeId: scope.id, remoteId, remoteVersion: version ?? null, syncStatus: "synced", updatedAt, deletedAt: null } as unknown as Tables[T]);
        }
        if (!query.trim()) {
          const received = new Set(ids);
          for (const previous of await tx.all(table, scope.id)) {
            if (previous.syncStatus === "synced" && !received.has(previous.id)) await tx.remove(table, previous.id);
          }
        }
        await tx.put("sync_state", { id: snapshotId(scope, table, query), scopeId: scope.id, resource: table, recordIds: JSON.stringify(ids), updatedAt });
        guard();
      });
    },
    async read(scope: Scope, query = "", page = 1, limit = 100) {
      const db = await database();
      return db.read(async (tx) => {
        const snapshot = await tx.get("sync_state", snapshotId(scope, table, query));
        const rows = (await tx.all(table, scope.id)).filter((row) => !row.deletedAt);
        const normalized = query.trim().toLocaleLowerCase("pt-BR");
        const matched = rows.filter((row) => {
          const data = row as unknown as Record<string, unknown>;
          return !normalized || ["name", "email", "phone", "cpf", "notes", "specialty", "category", "description", "title", "location"]
            .some((field) => typeof data[field] === "string" && data[field].toLocaleLowerCase("pt-BR").includes(normalized));
        });
        const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
        const data = matched.slice(offset, offset + Math.max(1, limit)).map((row) => {
          const { id: _, scopeId: __, remoteId, remoteVersion, syncStatus: ___, updatedAt: ____, deletedAt: _____, ...record } = row;
          return { ...record, id: remoteId!, ...(table === "appointments" ? { version: remoteVersion ?? 1 } : {}) } as unknown as RemoteRow<T>;
        });
        return { data, known: Boolean(snapshot) || rows.length > 0, updatedAt: snapshot?.updatedAt ?? Math.max(0, ...rows.map((row) => row.updatedAt)), totalItems: matched.length };
      });
    },
    async removeRemote(scope: Scope, remoteId: number, guard: Guard = noGuard) {
      const db = await database();
      await db.write(async (tx) => { guard(); await tx.remove(table, recordId(scope, table, remoteId)); guard(); });
    },
  };
}
