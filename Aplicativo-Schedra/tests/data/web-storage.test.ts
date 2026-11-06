import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../src/shared/database/database.web";
import { accountScope, businessScope } from "../../src/shared/database/scope";
import { createCollectionRepository } from "../../src/shared/database/collection-repository";
import { createAvatarRepository } from "../../src/shared/media/avatar-repository";

describe("Expo Web IndexedDB adapter", () => {
  it("persists through a new repository, rolls back and enforces account scope", async () => {
    const db = await getLocalDatabase();
    const scope = businessScope({ user: { id: 42 } });
    const client = { id: 1, name: "Cliente web", email: "client@example.com", phone: "11999999999", cpf: "", notes: "" };
    await createCollectionRepository(getLocalDatabase, "clients").saveRemote(scope, [client]);
    expect((await createCollectionRepository(getLocalDatabase, "clients").read(scope)).data).toEqual([client]);
    await expect(db.write(async (tx) => {
      await tx.put("preferences", { id: "rollback", scopeId: "device", value: "no" });
      throw new Error("interrupted");
    })).rejects.toThrow("interrupted");
    expect(await db.read((tx) => tx.get("preferences", "rollback"))).toBeNull();
    const avatars = createAvatarRepository(getLocalDatabase);
    await avatars.save(42, { id: "web-photo", content: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg", width: 10, height: 10, checksum: "a".repeat(64) }, "web-op", () => {});
    expect((await avatars.get(42))?.content).toEqual(new Uint8Array([1, 2, 3]));
    expect(await avatars.get(43)).toBeNull();
    const own = await avatars.next(42);
    await expect(db.write(async (tx) => {
      await tx.put("scopes", accountScope(43));
      await tx.put("outbox", { ...own!.operation, id: "other-op", scopeId: accountScope(43).id });
    })).rejects.toThrow("outro escopo");
    await db.write((tx) => tx.removeScope(accountScope(42).id));
    expect(await avatars.get(42)).toBeNull();
    expect((await createCollectionRepository(getLocalDatabase, "clients").read(scope)).data).toHaveLength(1);
  });
});
