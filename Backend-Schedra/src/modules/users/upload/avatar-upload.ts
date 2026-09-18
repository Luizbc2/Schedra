import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import multer, { type FileFilterCallback, type Multer, type StorageEngine } from "multer";
import sharp, { type Metadata } from "sharp";
import { avatarAssetStore, legacyAvatarDirectory, type AvatarAssetStore } from "./avatar-assets";

export const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedAvatarTypes = new Map<string, ReadonlySet<string>>([
  [".jpg", new Set(["image/jpeg"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".png", new Set(["image/png"])],
  [".webp", new Set(["image/webp"])],
]);

export class InvalidAvatarFileError extends Error {
  constructor() {
    super("Envie uma imagem JPG, PNG ou WEBP valida.");
    this.name = "InvalidAvatarFileError";
  }
}

export class InvalidAvatarContentError extends Error {
  constructor() {
    super("O conteúdo enviado não é uma imagem JPG, PNG ou WEBP válida.");
    this.name = "InvalidAvatarContentError";
  }
}

export class AvatarStorageError extends Error {
  constructor() {
    super("Não foi possível armazenar a imagem processada.");
    this.name = "AvatarStorageError";
  }
}

export const getAvatarExtension = (originalName: string): string =>
  path.extname(originalName).toLowerCase();

export const isAllowedAvatarFile = (file: Pick<Express.Multer.File, "originalname" | "mimetype">): boolean => {
  const acceptedMimeTypes = allowedAvatarTypes.get(getAvatarExtension(file.originalname));
  return acceptedMimeTypes?.has(file.mimetype.toLowerCase()) ?? false;
};

export const buildAvatarFilename = (originalName: string): string =>
  `user-${Date.now()}-${randomUUID()}${getAvatarExtension(originalName)}`;

const buildProcessedAvatarFilename = (userId: number): string =>
  `user-${userId}-${Date.now()}-${randomUUID()}.webp`;

export const createAvatarUpload = (
  storage: StorageEngine,
  maxFileSize = AVATAR_MAX_FILE_SIZE,
): Multer => multer({
  storage,
  limits: { fileSize: maxFileSize, files: 1 },
  fileFilter: (_request, file, callback: FileFilterCallback) => {
    if (!isAllowedAvatarFile(file)) {
      callback(new InvalidAvatarFileError());
      return;
    }

    callback(null, true);
  },
});

export const avatarDirectory = legacyAvatarDirectory;

export const avatarUpload = createAvatarUpload(multer.memoryStorage());

export const processAvatar = async (
  file: Express.Multer.File,
  userId: number,
  outputDirectory?: string,
  store: AvatarAssetStore = avatarAssetStore,
): Promise<string> => {
  let metadata: Metadata;

  try {
    metadata = await sharp(file.buffer, { failOn: "warning", limitInputPixels: 16_777_216 }).metadata();

    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new InvalidAvatarContentError();
    }

    if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) {
      throw new InvalidAvatarContentError();
    }
  } catch (error) {
    if (error instanceof InvalidAvatarContentError) throw error;
    throw new InvalidAvatarContentError();
  }

  const filename = buildProcessedAvatarFilename(userId);
  try {
    const content = await sharp(file.buffer, { failOn: "warning", limitInputPixels: 16_777_216 })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
    if (outputDirectory) {
      await fs.promises.mkdir(outputDirectory, { recursive: true });
      await fs.promises.writeFile(path.join(outputDirectory, filename), content, { flag: "wx" });
    } else {
      await store.save(filename, userId, content);
    }
    return `/uploads/avatars/${filename}`;
  } catch {
    throw new AvatarStorageError();
  }
};

export const removeLocalAvatar = async (avatarUrl?: string | null): Promise<void> => {
  if (!avatarUrl?.startsWith("/uploads/avatars/")) return;
  const filename = path.basename(avatarUrl);
  try {
    await avatarAssetStore.remove(filename);
    await fs.promises.rm(path.join(avatarDirectory, filename), { force: true });
  } catch (error) {
    console.error(`Avatar cleanup failed for ${filename}.`, error);
  }
};

export const uploadAvatarSingle: RequestHandler = (request, response, next) => {
  avatarUpload.single("avatar")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({ message: "A imagem deve ter no maximo 5 MB." });
      return;
    }

    if (error instanceof InvalidAvatarFileError) {
      response.status(415).json({ message: error.message });
      return;
    }

    response.status(400).json({ message: "Nao foi possivel processar a imagem enviada." });
  });
};
