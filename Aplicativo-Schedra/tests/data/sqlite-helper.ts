import { DatabaseSync } from "node:sqlite";
import { createSqlDatabase, migrateDatabase, type SqlDriver, type SqlValue } from "../../src/shared/database/sql-store";

export async function openTestDatabase(filename = ":memory:") {
  const native = new DatabaseSync(filename);
  const driver: SqlDriver = {
    execAsync: async (sql) => { native.exec(sql); },
    runAsync: async (sql, values) => native.prepare(sql).run(...values),
    getFirstAsync: async <T>(sql: string, values: SqlValue[] = []) => (native.prepare(sql).get(...values) ?? null) as T | null,
    getAllAsync: async <T>(sql: string, values: SqlValue[] = []) => native.prepare(sql).all(...values) as T[],
    transactionAsync: async (work) => {
      native.exec("BEGIN IMMEDIATE");
      try { await work(driver); native.exec("COMMIT"); }
      catch (error) { native.exec("ROLLBACK"); throw error; }
    },
  };
  await migrateDatabase(driver);
  return { native, driver, db: createSqlDatabase(driver), close: () => native.close() };
}
