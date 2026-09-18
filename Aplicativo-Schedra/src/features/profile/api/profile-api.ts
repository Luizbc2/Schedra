import { apiRequest } from "../../../shared/api/client";
import type { AuthUser } from "../../auth/types";

export type UpdateProfileInput = {
  name: string;
  email: string;
  cpf: string;
  currentPassword?: string;
  password?: string;
};

export const updateProfile = (token: string, input: UpdateProfileInput) =>
  apiRequest<{ message: string; user: AuthUser }>("/users/me", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
