import { afterEach, describe, expect, it } from "vitest";
import { openTestDatabase } from "./sqlite-helper";
import { createAvatarRepository } from "../../src/shared/media/avatar-repository";
import { accountScope } from "../../src/shared/database/scope";
import type { LocalDatabase } from "../../src/shared/database/types";

const cleanup: (() => void)[] = [];
afterEach(() => { for (const close of cleanup.splice(0)) close(); });
async function setup() { const connection = await openTestDatabase(); cleanup.push(connection.close); return connection; }
const image = { id: "image-1", content: new Uint8Array([255, 216, 255, 12, 5]), mimeType: "image/jpeg", checksum: "a".repeat(64), width: 512, height: 512 };
const guard = () => {};

describe("avatar BLOB and durable upload", () => {
  it("stores bytes and queue atomically, then keeps the BLOB after acknowledgment", async () => {
    const { db, native } = await setup();
    const repo = createAvatarRepository(async () => db);
    await repo.save(1, image, "operation-1", guard);
    expect(native.prepare("SELECT typeof(content) AS storage FROM media_assets").get()).toMatchObject({ storage: "blob" });
    expect((await repo.get(1))?.content).toEqual(image.content);
    const pending = await repo.next(1);
    expect(pending?.operation.id).toBe("operation-1");
    expect(await repo.next(2)).toBeNull();
    expect(await repo.get(2)).toBeNull();
    await repo.complete(1, pending!.operation, "/uploads/avatars/test.webp", guard);
    expect(await repo.next(1)).toBeNull();
    expect(await repo.get(1)).toMatchObject({ syncStatus: "synced", content: image.content, remoteUrl: "/uploads/avatars/test.webp" });
    await db.write((tx) => tx.removeScope(accountScope(1).id));
    expect(await repo.get(1)).toBeNull();
  });

  it("does not lose the previous photo if writing the queue fails", async () => {
    const { db } = await setup();
    const repo = createAvatarRepository(async () => db);
    await repo.save(1, image, "old-operation", guard);
    const faulty: LocalDatabase = {
      read: db.read,
      write: (work) => db.write((tx) => work({ ...tx, put: async (table, row) => {
        if (table === "outbox") throw new Error("disk full");
        await tx.put(table, row);
      } })),
    };
    await expect(createAvatarRepository(async () => faulty).save(1, { ...image, id: "image-2" }, "new-operation", guard)).rejects.toThrow("disk full");
    expect((await repo.get(1))?.id).toBe("image-1");
    expect(await db.read((tx) => tx.get("media_assets", "image-2"))).toBeNull();
    expect((await repo.next(1))?.operation.id).toBe("old-operation");
  });

  it("replaces pending photos and ignores an old response without reverting the new selection", async () => {
    const { db } = await setup();
    const repo = createAvatarRepository(async () => db);
    await repo.save(1, image, "old-operation", guard);
    const old = await repo.next(1);
    await repo.save(1, { ...image, id: "image-2", content: new Uint8Array([10, 20]) }, "new-operation", guard);
    expect(await repo.complete(1, old!.operation, "/old.webp", guard)).toBe(false);
    expect((await repo.get(1))?.id).toBe("image-2");
    expect(await db.read((tx) => tx.get("media_assets", "image-1"))).toBeNull();
    const pending = await repo.next(1);
    await repo.fail(1, pending!.operation, "HTTP_415", true, guard);
    expect(await repo.next(1, Date.now() + 1000000)).toBeNull();
    expect((await repo.get(1))?.syncStatus).toBe("pending");
    await repo.retry(1);
    expect((await repo.next(1))?.operation.attempts).toBe(0);
  });

  it("rejects oversized data and cross-account references", async () => {
    const { db } = await setup();
    const repo = createAvatarRepository(async () => db);
    await expect(repo.save(1, { ...image, content: new Uint8Array(5242881) }, "invalid", guard)).rejects.toThrow("5 MB");
    await repo.save(1, image, "valid", guard);
    await expect(repo.save(2, image, "other", guard)).rejects.toThrow("outra conta");
    const operation = (await repo.next(1))?.operation;
    await expect(db.write(async (tx) => {
      await tx.put("scopes", accountScope(2));
      if (operation) await tx.put("outbox", { ...operation, id: "foreign", scopeId: accountScope(2).id });
    })).rejects.toThrow();
    expect((await repo.get(1))?.content).toEqual(image.content);
  });
});
