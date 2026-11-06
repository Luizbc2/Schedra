import express, { Router } from "express";
import path from "node:path";
import { AvatarAssetModel } from "../models/avatar-asset.model";

export const legacyAvatarDirectory = path.join(process.env.AVATAR_UPLOAD_ROOT?.trim() || path.resolve(process.cwd(), "uploads"), "avatars");

export interface AvatarAssetStore {
  save(filename: string, userId: number, content: Buffer): Promise<void>;
  read(filename: string): Promise<Buffer | null>;
  remove(filename: string): Promise<void>;
}

export const avatarAssetStore: AvatarAssetStore = {
  async save(filename, userId, content) { await AvatarAssetModel.create({ filename, userId, content }); },
  async read(filename) { return (await AvatarAssetModel.findByPk(filename))?.content ?? null; },
  async remove(filename) { await AvatarAssetModel.destroy({ where: { filename } }); },
};

export function createAvatarAssetRouter(store = avatarAssetStore, legacyDirectory = legacyAvatarDirectory): Router {
  const router = Router();
  router.get("/:filename", async (request, response, next) => {
    const filename = request.params.filename;
    if (!/^user-[\w-]+\.(webp|png|jpe?g)$/i.test(filename)) { response.sendStatus(404); return; }
    try {
      const content = await store.read(filename);
      if (!content) { next(); return; }
      response.set("X-Content-Type-Options", "nosniff");
      response.set("Cache-Control", "private, max-age=3600");
      response.type("image/webp").send(content);
    } catch (error) { next(error); }
  });
  router.use(express.static(legacyDirectory, { index: false, dotfiles: "deny" }));
  return router;
}
