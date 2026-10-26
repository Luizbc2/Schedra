import { apiRequest } from "../../../shared/api/client";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { avatarFile } from "../../profile/api/avatar-file";
import type { AuthOrganization, AuthUser, LoginInput, SignupInput } from "../types";
import type { MediaRow } from "../../../shared/database/types";

export type AuthResponse = {
  message: string;
  token: string;
  refreshToken?: string;
  organization?: AuthOrganization;
  user: AuthUser;
};
export type SignupResponse = { message: string; user: AuthUser };

export const login = (input: LoginInput) =>
  apiRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });

export const signup = (input: SignupInput) =>
  apiRequest<SignupResponse>("/users", { method: "POST", body: JSON.stringify(input) });

export const logout = (token: string) => apiRequest<void>("/auth/logout", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});

export const uploadAvatar = async (token: string, uri: string, mimeType?: string) => {
  const body = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    const file = avatarFile(uri, blob.type || mimeType);
    body.append("avatar", blob, file.name);
  } else {
    avatarFile(uri, mimeType);
    body.append("avatar", new File(uri));
  }

  return apiRequest<{ message: string; user: AuthUser }>("/users/me/avatar", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
};

export async function uploadAvatarBytes(token: string, media: MediaRow, operationId: string) {
  const body = new FormData();
  let temporary: File | undefined;
  const type = avatarFile("avatar", media.mimeType);
  try {
    if (Platform.OS === "web") body.append("avatar", new Blob([new Uint8Array(media.content)], { type: media.mimeType }), type.name);
    else {
      if (!/^[a-f0-9-]{36}$/i.test(operationId)) throw new Error("Identificador de envio invalido.");
      temporary = new File(Paths.cache, `schedra-upload-${operationId}.${media.mimeType === "image/png" ? "png" : media.mimeType === "image/webp" ? "webp" : "jpg"}`);
      temporary.create({ overwrite: true });
      temporary.write(media.content);
      body.append("avatar", temporary);
    }
    return await apiRequest<{ user: AuthUser }>("/users/me/avatar", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": operationId }, body });
  } finally {
    try { if (temporary?.exists) temporary.delete(); } catch { /* A later retry recreates this temporary file from SQLite. */ }
  }
}
