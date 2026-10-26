import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { openTestDatabase } from "./sqlite-helper";
import { createCollectionRepository } from "../../src/shared/database/collection-repository";
import { createSessionStore, type KeyValueStore } from "../../src/shared/database/session-store";
import { activateDataSession, captureDataSession, personalScope, businessScope, accountScope } from "../../src/shared/database/scope";
import { migrateDatabase } from "../../src/shared/database/sql-store";
import { createAvatarRepository } from "../../src/shared/media/avatar-repository";
import type { PersistedSession } from "../../src/shared/database/types";

const close: (() => void)[] = [];
const session: PersistedSession = { token: "access", refreshToken: "refresh", workspaceMode: "personal", user: {
  id: 1, name: "Teste", email: "test@example.com", cpf: "52998224725", accountType: "personal", active: true, role: "user", avatarUrl: null,
} };
const client = { id: 1, name: "Cliente ' ; DROP TABLE clients; --", email: "client@example.com", phone: "11999999999", cpf: "", notes: "" };
afterEach(() => { for (const action of close.splice(0)) action(); activateDataSession(null); });
async function database(filename?: string) { const connection = await openTestDatabase(filename); close.push(connection.close); return connection; }
function keyValueStore() {
  const values = new Map<string, string>();
  const store: KeyValueStore = { get: async (key) => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async (key) => { values.delete(key); } };
  return { values, store };
}

describe("SQLite persistence", () => {
  it("migrates once and recovers records after the connection reopens", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "schedra-sqlite-"));
    try {
      const filename = path.join(directory, "schedra.db");
      const first = await openTestDatabase(filename);
      const repo = createCollectionRepository(async () => first.db, "clients");
      const scope = businessScope(session);
      await repo.saveRemote(scope, [client]);
      const photo = { id: "persistent-photo", content: new Uint8Array([1, 2, 3, 4]), mimeType: "image/jpeg", width: 16, height: 16, checksum: "a".repeat(64) };
      await createAvatarRepository(async () => first.db).save(1, photo, "persistent-upload", () => {});
      await migrateDatabase(first.driver);
      first.close();
      const reopened = await openTestDatabase(filename);
      try {
        const result = await createCollectionRepository(async () => reopened.db, "clients").read(scope);
        expect(result.data).toEqual([client]);
        const avatars = createAvatarRepository(async () => reopened.db);
        expect((await avatars.get(1))?.content).toEqual(photo.content);
        expect((await avatars.next(1))?.operation.id).toBe("persistent-upload");
        expect(reopened.native.prepare("PRAGMA user_version").get()).toMatchObject({ user_version: 1 });
      } finally { reopened.close(); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("rolls back a record and its queue entry together on failure", async () => {
    const { db } = await database();
    const scope = accountScope(1);
    await expect(db.write(async (tx) => {
      await tx.put("scopes", scope);
      await tx.put("preferences", { id: "temporary", scopeId: scope.id, value: "value" });
      throw new Error("storage failure");
    })).rejects.toThrow("storage failure");
    expect(await db.read((tx) => tx.get("preferences", "temporary"))).toBeNull();
    expect(await db.read((tx) => tx.get("scopes", scope.id))).toBeNull();
  });

  it("never mixes equal remote IDs across users or organizations", async () => {
    const { db } = await database();
    const repo = createCollectionRepository(async () => db, "clients");
    const a = businessScope(session);
    const b = businessScope({ user: { ...session.user, id: 2 } });
    const c = businessScope({ user: session.user, organization: { id: 5 } });
    await repo.saveRemote(a, [client]);
    await repo.saveRemote(b, [{ ...client, name: "Conta B" }]);
    await repo.saveRemote(c, [{ ...client, name: "Empresa C" }]);
    expect((await repo.read(a)).data[0].name).toBe(client.name);
    expect((await repo.read(b)).data[0].name).toBe("Conta B");
    expect((await repo.read(c)).data[0].name).toBe("Empresa C");
    await db.write((tx) => tx.removeScope(a.id));
    expect((await repo.read(a)).data).toEqual([]);
    expect((await repo.read(b)).data).toHaveLength(1);
  });

  it("blocks a delayed response after account switch", async () => {
    const { db } = await database();
    activateDataSession(session);
    const captured = captureDataSession(session.token);
    activateDataSession({ ...session, token: "other", user: { ...session.user, id: 2 } });
    await expect(createCollectionRepository(async () => db, "clients").saveRemote(captured.scope, [client], "", captured.assertCurrent)).rejects.toThrow("sessao mudou");
    expect(await db.read((tx) => tx.all("clients"))).toHaveLength(0);
    expect(() => captureDataSession("access")).toThrow("sessao mudou");
  });

  it("queries by actual user fields and paginates cached records", async () => {
    const { db } = await database();
    const repo = createCollectionRepository(async () => db, "clients");
    const scope = businessScope(session);
    await repo.saveRemote(scope, [client, { ...client, id: 2, name: "Ana" }]);
    expect((await repo.read(scope, "business")).data).toEqual([]);
    expect((await repo.read(scope, "ana")).data[0].id).toBe(2);
    expect((await repo.read(scope, "", 2, 1)).data).toHaveLength(1);
  });
});

describe("session migration", () => {
  it("moves a legacy profile to SQLite and keeps only credentials in secure storage", async () => {
    const { db } = await database();
    const { store, values } = keyValueStore();
    values.set("schedra.session", JSON.stringify(session));
    const sessions = createSessionStore(async () => db, store);
    expect(await sessions.load()).toEqual(session);
    expect(values.has("schedra.session")).toBe(false);
    const credentials = JSON.parse(values.get("schedra.credentials.v2")!);
    expect(credentials).toEqual({ token: "access", refreshToken: "refresh", userId: 1 });
    expect(JSON.stringify(credentials)).not.toContain(session.user.email);
    expect(await sessions.load()).toEqual(session);
    await db.write((tx) => tx.put("preferences", { id: "theme", scopeId: "device", value: "dark" }));
    await sessions.clear(1);
    expect(await sessions.load()).toBeNull();
    expect(await db.read((tx) => tx.all("profiles"))).toEqual([]);
    expect(await db.read((tx) => tx.get("preferences", "theme"))).toMatchObject({ value: "dark" });
  });

  it("preserves legacy credentials if migration fails", async () => {
    const { store, values } = keyValueStore();
    values.set("schedra.session", JSON.stringify(session));
    const sessions = createSessionStore(async () => { throw new Error("disk full"); }, store);
    await expect(sessions.load()).rejects.toThrow("disk full");
    expect(values.get("schedra.session")).toBe(JSON.stringify(session));
  });

  it("returns to login when Keychain survives a reinstall but the local profile does not", async () => {
    const { db } = await database();
    const { store, values } = keyValueStore();
    values.set("schedra.credentials.v2", JSON.stringify({ token: "old-keychain-token", userId: 1 }));
    const sessions = createSessionStore(async () => db, store);
    expect(await sessions.load()).toBeNull();
    expect(values.has("schedra.credentials.v2")).toBe(false);
  });
});
