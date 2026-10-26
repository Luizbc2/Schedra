import { CryptoDigestAlgorithm, digest, randomUUID } from "expo-crypto";
import { fromByteArray } from "base64-js";
import { getLocalDatabase } from "../database/database";
import { captureDataSession } from "../database/scope";
import { createAvatarRepository } from "./avatar-repository";
import { prepareAvatar } from "./prepare-avatar";
import { avatarChanged } from "./avatar-events";

export const avatars = createAvatarRepository(getLocalDatabase);

export async function saveLocalAvatar(token: string, uri: string, dimensions?: { width: number; height: number }, remoteUrl?: string) {
  const session = captureDataSession(token);
  const image = await prepareAvatar(uri, dimensions);
  const checksum = Array.from(new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, new Uint8Array(image.content))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  session.assertCurrent();
  await avatars.save(session.userId, { ...image, id: randomUUID(), checksum }, randomUUID(), session.assertCurrent, remoteUrl);
  avatarChanged();
}

export async function avatarPreview(userId: number) {
  const image = await avatars.get(userId);
  if (!image) return null;
  return { uri: `data:${image.mimeType};base64,${fromByteArray(image.content)}`, status: image.syncStatus };
}
