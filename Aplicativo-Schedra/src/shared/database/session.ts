import { credentials } from "./credentials";
import { getLocalDatabase } from "./database";
import { createSessionStore } from "./session-store";

export const sessionStore = createSessionStore(getLocalDatabase, credentials);

export async function pendingOperations(userId: number) {
  const db = await getLocalDatabase();
  return db.read(async (tx) => {
    const scopes = (await tx.all("scopes")).filter((scope) => scope.userId === userId);
    let count = 0;
    for (const scope of scopes) count += (await tx.all("outbox", scope.id)).length;
    return count;
  });
}
