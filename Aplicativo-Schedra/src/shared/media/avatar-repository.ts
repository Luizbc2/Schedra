import { accountScope } from "../database/scope";
import type { LocalDatabase, MediaRow, OutboxRow } from "../database/types";

export type AvatarInput = Pick<MediaRow, "id" | "content" | "mimeType" | "checksum" | "width" | "height">;
const preferenceId = (userId: number) => `avatar:${userId}`;

export function createAvatarRepository(database: () => Promise<LocalDatabase>) {
  return {
    async get(userId: number) {
      const db = await database();
      const scope = accountScope(userId);
      return db.read(async (tx) => {
        const preference = await tx.get("preferences", preferenceId(userId));
        if (!preference || preference.scopeId !== scope.id) return null;
        const media = await tx.get("media_assets", preference.value);
        return media?.scopeId === scope.id && media.ownerId === userId ? media : null;
      });
    },
    async save(userId: number, image: AvatarInput, operationId: string, guard: () => void, remoteUrl?: string) {
      if (!image.content.byteLength || image.content.byteLength > 5 * 1024 * 1024) throw new Error("Escolha uma foto de ate 5 MB.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)) throw new Error("Formato de foto invalido.");
      if (image.width < 1 || image.height < 1 || image.width > 512 || image.height > 512) throw new Error("A foto precisa ter ate 512 por 512 pixels.");
      if (!/^[a-f0-9]{64}$/.test(image.checksum)) throw new Error("Verificacao da foto invalida.");
      const db = await database();
      const scope = accountScope(userId);
      await db.write(async (tx) => {
        guard();
        await tx.put("scopes", scope);
        const collision = await tx.get("media_assets", image.id);
        if (collision && (collision.scopeId !== scope.id || collision.ownerId !== userId)) throw new Error("Foto de outra conta.");
        const previous = await tx.get("preferences", preferenceId(userId));
        if (remoteUrl && previous) return;
        const now = Date.now();
        await tx.put("media_assets", { ...image, content: new Uint8Array(image.content), scopeId: scope.id, ownerId: userId,
          byteSize: image.content.byteLength, remoteUrl: remoteUrl ?? null, syncStatus: remoteUrl ? "synced" : "pending", createdAt: now, updatedAt: now });
        if (!remoteUrl) await tx.put("outbox", { id: operationId, scopeId: scope.id, entityType: "avatar", entityId: image.id, action: "update",
          payload: "{}", mediaId: image.id, baseVersion: null, dependencyId: null, attempts: 0, nextAttemptAt: now, status: "pending", lastError: null, createdAt: now });
        await tx.put("preferences", { id: preferenceId(userId), scopeId: scope.id, value: image.id });
        if (previous && previous.value !== image.id) {
          for (const old of await tx.all("outbox", scope.id)) {
            if (old.entityType === "avatar" && old.mediaId === previous.value) await tx.remove("outbox", old.id);
          }
          const old = await tx.get("media_assets", previous.value);
          if (old?.scopeId === scope.id && old.ownerId === userId) await tx.remove("media_assets", old.id);
        }
        guard();
      });
    },
    async next(userId: number, now = Date.now()) {
      const db = await database();
      const scope = accountScope(userId);
      return db.read(async (tx) => {
        const operation = (await tx.all("outbox", scope.id)).filter((row) => row.entityType === "avatar" && row.status === "pending" && row.nextAttemptAt <= now)
          .sort((a, b) => a.createdAt - b.createdAt)[0];
        if (!operation?.mediaId) return null;
        const media = await tx.get("media_assets", operation.mediaId);
        if (!media || media.scopeId !== scope.id || media.ownerId !== userId) throw new Error("Foto pendente nao encontrada nesta conta.");
        return { operation, media };
      });
    },
    async complete(userId: number, operation: OutboxRow, remoteUrl: string | null, guard: () => void) {
      const db = await database();
      const scope = accountScope(userId);
      return db.write(async (tx) => {
        guard();
        const pending = await tx.get("outbox", operation.id);
        if (!pending || pending.scopeId !== scope.id || !pending.mediaId) return false;
        const media = await tx.get("media_assets", pending.mediaId);
        if (!media || media.ownerId !== userId || media.scopeId !== scope.id) throw new Error("Foto de outra conta.");
        await tx.put("media_assets", { ...media, syncStatus: "synced", remoteUrl, updatedAt: Date.now() });
        await tx.remove("outbox", operation.id);
        const current = await tx.get("preferences", preferenceId(userId));
        const selected = current?.value === media.id;
        if (selected) for (const profile of await tx.all("profiles", scope.id)) await tx.put("profiles", { ...profile, avatarUrl: remoteUrl });
        guard();
        return selected;
      });
    },
    async fail(userId: number, operation: OutboxRow, code: string, blocked: boolean, guard: () => void) {
      const db = await database();
      await db.write(async (tx) => {
        guard();
        const current = await tx.get("outbox", operation.id);
        if (!current || current.scopeId !== accountScope(userId).id) return;
        const attempts = current.attempts + 1;
        await tx.put("outbox", { ...current, attempts, status: blocked || attempts >= 20 ? "blocked" : "pending", lastError: code,
          nextAttemptAt: Date.now() + Math.min(60000, 1000 * 2 ** Math.min(attempts, 6)) });
        guard();
      });
    },
    async retry(userId: number) {
      const db = await database();
      await db.write(async (tx) => {
        for (const item of await tx.all("outbox", accountScope(userId).id)) {
          if (item.entityType === "avatar") await tx.put("outbox", { ...item, status: "pending", attempts: 0, nextAttemptAt: 0, lastError: null });
        }
      });
    },
  };
}
