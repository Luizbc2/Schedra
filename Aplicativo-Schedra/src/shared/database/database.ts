import { openDatabaseAsync } from "expo-sqlite";

import { createSqlDatabase, migrateDatabase, type SqlDriver } from "./sql-store";
import type { LocalDatabase } from "./types";

let connection: Promise<LocalDatabase> | undefined;

export function getLocalDatabase(): Promise<LocalDatabase> {
  connection ??= (async () => {
    const native = await openDatabaseAsync("schedra.db");
    try {
      // One private connection preserves foreign_keys; all access is serialized by the store.
      const driver: SqlDriver = {
        execAsync: (sql) => native.execAsync(sql),
        runAsync: (sql, values) => native.runAsync(sql, values),
        getFirstAsync: (sql, values = []) => native.getFirstAsync(sql, values),
        getAllAsync: (sql, values = []) => native.getAllAsync(sql, values),
        transactionAsync: async (work) => {
          await native.execAsync("BEGIN IMMEDIATE");
          try { await work(driver); await native.execAsync("COMMIT"); }
          catch (error) { await native.execAsync("ROLLBACK"); throw error; }
        },
      };
      await migrateDatabase(driver);
      return createSqlDatabase(driver);
    } catch (error) {
      await native.closeAsync();
      throw error;
    }
  })().catch((error) => { connection = undefined; throw error; });
  return connection;
}
