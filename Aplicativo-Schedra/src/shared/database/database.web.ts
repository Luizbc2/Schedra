import { DATABASE_VERSION, scopedTables, tableNames, tableColumns } from "./schema";
import type { LocalDatabase, LocalTransaction, TableName, Tables } from "./types";

let connection: Promise<LocalDatabase> | undefined;
const request = <T>(value: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  value.onsuccess = () => resolve(value.result);
  value.onerror = () => reject(value.error);
});

function tables(tx: IDBTransaction): LocalTransaction {
  return {
    get: async <T extends TableName>(table: T, id: string) => (await request(tx.objectStore(table).get(id)) ?? null) as Tables[T] | null,
    all: async <T extends TableName>(table: T, scopeId?: string) => {
      const store = tx.objectStore(table);
      return request(scopeId === undefined ? store.getAll() : store.index("scopeId").getAll(scopeId)) as Promise<Tables[T][]>;
    },
    put: async (table, row) => {
      if (table !== "scopes" && table !== "preferences") {
        const scoped = row as { scopeId: string; ownerId?: number; userId?: number; mediaId?: string };
        const scope = await request(tx.objectStore("scopes").get(scoped.scopeId)) as Tables["scopes"] | undefined;
        if (!scope) throw new Error("Escopo local nao encontrado.");
        if ((scoped.ownerId !== undefined && scoped.ownerId !== scope.userId) || (table === "profiles" && scoped.userId !== scope.userId)) throw new Error("Registro de outra conta.");
        if (table === "outbox" && scoped.mediaId) {
          const media = await request(tx.objectStore("media_assets").get(scoped.mediaId)) as Tables["media_assets"] | undefined;
          if (!media || media.scopeId !== scoped.scopeId) throw new Error("Foto de outro escopo.");
        }
      }
      const record = row as unknown as Record<string, unknown>;
      const stored = Object.fromEntries(tableColumns[table].map((column) => {
        if (record[column] === undefined) throw new Error(`Campo local ausente: ${table}.${column}`);
        return [column, record[column]];
      }));
      await request(tx.objectStore(table).put(stored));
    },
    remove: async (table, id) => { await request(tx.objectStore(table).delete(id)); },
    removeScope: async (scopeId) => {
      for (const table of scopedTables) {
        const store = tx.objectStore(table);
        const keys = await request(store.index("scopeId").getAllKeys(scopeId));
        for (const key of keys) await request(store.delete(key));
      }
      await request(tx.objectStore("scopes").delete(scopeId));
    },
  };
}

export function getLocalDatabase(): Promise<LocalDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open("schedra", DATABASE_VERSION);
    opening.onupgradeneeded = () => {
      for (const name of tableNames) {
        if (opening.result.objectStoreNames.contains(name)) continue;
        const store = opening.result.createObjectStore(name, { keyPath: "id" });
        if (name !== "scopes") store.createIndex("scopeId", "scopeId");
      }
    };
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => reject(new Error("Feche outras abas do Schedra para atualizar o armazenamento."));
    opening.onsuccess = () => {
      opening.result.onversionchange = () => { opening.result.close(); connection = undefined; };
      resolve(opening.result);
    };
  }).then((db) => {
    const execute = async <T>(mode: IDBTransactionMode, work: (tx: LocalTransaction) => Promise<T>) => {
      const native = db.transaction(tableNames, mode);
      const completion = new Promise<void>((resolve, reject) => {
        native.oncomplete = () => resolve();
        native.onabort = () => reject(native.error ?? new Error("Transacao local cancelada."));
        native.onerror = () => reject(native.error);
      });
      void completion.catch(() => undefined);
      try {
        const result = await work(tables(native));
        await completion;
        return result;
      } catch (error) {
        try { native.abort(); } catch { /* The browser may already have rolled back. */ }
        await completion.catch(() => undefined);
        throw error;
      }
    };
    return { read: (work) => execute("readonly", work), write: (work) => execute("readwrite", work) } satisfies LocalDatabase;
  }).catch((error) => { connection = undefined; throw error; });
  return connection;
}
