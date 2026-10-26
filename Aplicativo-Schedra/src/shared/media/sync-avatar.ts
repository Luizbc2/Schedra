import { ApiError } from "../api/client";
import { captureDataSession } from "../database/scope";
import { isOnline } from "../network/connection";
import { uploadAvatarBytes } from "../../features/auth/api/auth-api";
import { avatars } from "./avatar-service";
import { avatarChanged } from "./avatar-events";

const running = new Set<number>();

export async function syncAvatar(token: string) {
  const session = captureDataSession(token);
  if (running.has(session.userId)) return null;
  running.add(session.userId);
  try {
    if (!(await isOnline())) return null;
    const next = await avatars.next(session.userId);
    if (!next) return null;
    session.assertCurrent();
    try {
      const response = await uploadAvatarBytes(token, next.media, next.operation.id);
      session.assertCurrent();
      const selected = await avatars.complete(session.userId, next.operation, response.user.avatarUrl, session.assertCurrent);
      avatarChanged();
      return selected ? response.user : null;
    } catch (error) {
      session.assertCurrent();
      const blocked = error instanceof ApiError && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status);
      await avatars.fail(session.userId, next.operation, error instanceof ApiError ? `HTTP_${error.status}` : "NETWORK", blocked, session.assertCurrent);
      avatarChanged();
      return null;
    }
  } finally { running.delete(session.userId); }
}
