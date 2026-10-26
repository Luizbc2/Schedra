import { DATABASE_VERSION, schemaSql, scopedTables, tableColumns } from "./schema";
import type { LocalDatabase, LocalTransaction, Tables, TableName } from "./types";

export type SqlValue = string | number | null | Uint8Array;
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, values: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, values?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, values?: SqlValue[]): Promise<T[]>;
}
export interface SqlDriver extends SqlConnection {
  transactionAsync(work: (tx: SqlConnection) => Promise<void>): Promise<void>;
}

export async function migrateDatabase(db: SqlDriver) {
  await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON; PRAGMA busy_timeout = 5000;");
  await db.transactionAsync(async (tx) => {
    const current = await tx.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    if ((current?.user_version ?? 0) > DATABASE_VERSION) throw new Error("O banco local foi criado por uma versao mais recente do aplicativo.");
    if ((current?.user_version ?? 0) === 0) {
      await tx.execAsync(schemaSql);
      await tx.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    }
  });
}

function decode<T extends TableName>(table: T, row: Tables[T] | null): Tables[T] | null {
  if (!row) return null;
  const value = { ...row } as unknown as Record<string, unknown>;
  for (const key of ["active", "completed"]) if (key in value) value[key] = Boolean(value[key]);
  if (table === "media_assets" && value.content) value.content = new Uint8Array(value.content as Uint8Array);
  return value as unknown as Tables[T];
}

function transaction(db: SqlConnection): LocalTransaction {
  return {
    get: async (table, id) => decode(table, await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [id])),
    all: async (table, scopeId) => {
      const rows = await db.getAllAsync<Tables[typeof table]>(`SELECT * FROM ${table}${scopeId === undefined ? "" : " WHERE scopeId = ?"}`, scopeId === undefined ? [] : [scopeId]);
      return rows.map((row) => decode(table, row)!);
    },
    put: async (table, row) => {
      // Table/column identifiers come only from the schema; user values are bound.
      const columns = tableColumns[table];
      const values = columns.map((column) => {
        const value = (row as unknown as Record<string, unknown>)[column];
        if (value === undefined) throw new Error(`Campo local ausente: ${table}.${column}`);
        return typeof value === "boolean" ? Number(value) : value as SqlValue;
      });
      await db.runAsync(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})
        ON CONFLICT(id) DO UPDATE SET ${columns.filter((column) => column !== "id").map((column) => `${column}=excluded.${column}`).join(",")}`, values);
    },
    remove: async (table, id) => { await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]); },
    removeScope: async (scopeId) => {
      // Delete dependent operations before their BLOBs, on both adapters.
      for (const table of ["outbox", ...scopedTables.filter((name) => name !== "outbox")]) {
        await db.runAsync(`DELETE FROM ${table} WHERE scopeId = ?`, [scopeId]);
      }
      await db.runAsync("DELETE FROM scopes WHERE id = ?", [scopeId]);
    },
  };
}

export function createSqlDatabase(driver: SqlDriver): LocalDatabase {
  let tail: Promise<unknown> = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>) => {
    const next = tail.then(work, work);
    tail = next.catch(() => undefined);
    return next;
  };
  return {
    read: (work) => serialize(() => work(transaction(driver))),
    write: (work) => serialize(async () => {
      let result: Awaited<ReturnType<typeof work>>;
      await driver.transactionAsync(async (tx) => { result = await work(transaction(tx)); });
      return result!;
    }),
  };
}
