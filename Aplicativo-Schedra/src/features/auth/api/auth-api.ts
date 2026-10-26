import { apiRequest } from "../../../shared/api/client";
import { Platform } from "react-native";
import { avatarFile } from "../../profile/api/avatar-file";
import type { AuthOrganization, AuthUser, LoginInput, SignupInput } from "../types";

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
    body.append("avatar", avatarFile(uri, mimeType) as unknown as Blob);
  }

  return apiRequest<{ message: string; user: AuthUser }>("/users/me/avatar", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
};
