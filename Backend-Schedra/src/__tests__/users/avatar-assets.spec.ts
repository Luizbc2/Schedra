import express from "express";
import request from "supertest";
import sharp from "sharp";
import { createAvatarAssetRouter, type AvatarAssetStore } from "../../modules/users/upload/avatar-assets";
import { processAvatar, AvatarStorageError } from "../../modules/users/upload/avatar-upload";

describe("persistent avatar delivery", () => {
  const saved = new Map<string, Buffer>();
  const store: AvatarAssetStore = {
    async save(filename, _userId, content) { saved.set(filename, content); },
    async read(filename) { return saved.get(filename) ?? null; },
    async remove(filename) { saved.delete(filename); },
  };
  beforeEach(() => saved.clear());
  const file = async () => ({ buffer: await sharp({ create: { width: 20, height: 20, channels: 3, background: "#fff" } }).png().toBuffer() } as Express.Multer.File);

  it("serves the uploaded bytes through a new router without local filesystem state", async () => {
    const url = await processAvatar(await file(), 1, undefined, store);
    const app = express().use("/uploads/avatars", createAvatarAssetRouter(store));
    const response = await request(app).get(url);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image/webp");
    expect((await sharp(response.body).metadata()).format).toBe("webp");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
  it("rejects arbitrary paths and non-images", async () => {
    const app = express().use("/uploads/avatars", createAvatarAssetRouter(store));
    expect((await request(app).get("/uploads/avatars/secrets.env")).status).toBe(404);
  });
  it("does not report successful upload when persistent storage fails", async () => {
    await expect(processAvatar(await file(), 1, undefined, { ...store, save: async () => { throw new Error("Unavailable"); } })).rejects.toBeInstanceOf(AvatarStorageError);
  });
});
