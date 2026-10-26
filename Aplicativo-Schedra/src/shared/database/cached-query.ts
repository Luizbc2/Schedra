import { ApiError } from "../api/client";
import { isOnline } from "../network/connection";
import { createCollectionRepository } from "./collection-repository";
import { getLocalDatabase } from "./database";
import { captureDataSession } from "./scope";
import type { EntityTable, RemoteEntities } from "./types";

type RemoteRecords<T extends EntityTable> = RemoteEntities[T][];
export type LocalResult = { source: "server" | "device"; savedAt: number };

export async function cachedQuery<T extends EntityTable>(table: T, token: string, load: () => Promise<RemoteRecords<T>>, query = "") {
  const session = captureDataSession(token, table === "personal_events");
  const repository = createCollectionRepository(getLocalDatabase, table);
  const readLocal = async () => {
    session.assertCurrent();
    const result = await repository.read(session.scope, query, 1, 10000);
    session.assertCurrent();
    if (!result.known) throw new Error("Conecte-se uma vez para salvar estes dados no aparelho.");
    return { data: result.data, local: { source: "device", savedAt: result.updatedAt } satisfies LocalResult };
  };
  if (!(await isOnline())) return readLocal();
  let records: RemoteRecords<T>;
  try { records = await load(); }
  catch (error) {
    session.assertCurrent();
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) throw error;
    try { return await readLocal(); } catch { throw error; }
  }
  session.assertCurrent();
  await repository.saveRemote(session.scope, records, query, session.assertCurrent);
  return { data: records, local: { source: "server", savedAt: Date.now() } satisfies LocalResult };
}

export async function cacheChangedRecord<T extends EntityTable>(table: T, token: string, record: RemoteRecords<T>[number]) {
  const session = captureDataSession(token, table === "personal_events");
  const repository = createCollectionRepository(getLocalDatabase, table);
  await repository.saveRemote(session.scope, [record], `record:${record.id}`, session.assertCurrent);
}

export async function cacheRemovedRecord(table: EntityTable, token: string, remoteId: number) {
  const session = captureDataSession(token, table === "personal_events");
  await createCollectionRepository(getLocalDatabase, table).removeRemote(session.scope, remoteId, session.assertCurrent);
}
