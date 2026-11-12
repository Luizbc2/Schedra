import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";

import { AuthProvider, useAuth } from "../../src/features/auth/AuthProvider";
import { configureApiAuth } from "../../src/shared/api/client";
import type { PersistedSession } from "../../src/shared/database/types";

const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), clear: vi.fn(), pending: vi.fn(), login: vi.fn(), signup: vi.fn(), logout: vi.fn() }));
vi.mock("../../src/shared/database/session", () => ({ sessionStore: { load: mocks.load, save: mocks.save, clear: mocks.clear }, pendingOperations: mocks.pending }));
vi.mock("../../src/features/auth/api/auth-api", () => ({ login: mocks.login, signup: mocks.signup, logout: mocks.logout }));
vi.mock("../../src/shared/media/avatar-service", () => ({ avatars: { get: vi.fn().mockResolvedValue(null) }, saveLocalAvatar: vi.fn() }));
vi.mock("../../src/shared/media/sync-avatar", () => ({ syncAvatar: vi.fn().mockResolvedValue(null) }));
vi.mock("../../src/shared/network/connection", () => ({ isOnline: vi.fn().mockResolvedValue(false), subscribeNetwork: () => () => {} }));
vi.mock("../../src/shared/api/client", () => ({ configureApiAuth: vi.fn(), resolveApiAsset: (path: string) => path }));

const stored: PersistedSession = { token: "access-1", refreshToken: "refresh-1", workspaceMode: "business", user: { id: 1, name: "Conta A", email: "a@example.com", cpf: "", accountType: "business", role: "user", active: true, avatarUrl: null } };
let auth: ReturnType<typeof useAuth>;
function State() { auth = useAuth(); return <Text>{auth.startupError || (auth.loading ? "Loading" : auth.user?.name ?? "Signed out")}</Text>; }
beforeEach(() => {
  mocks.load.mockResolvedValue(stored);
  mocks.save.mockResolvedValue(undefined);
  mocks.clear.mockResolvedValue(undefined);
  mocks.pending.mockResolvedValue(0);
  mocks.logout.mockResolvedValue(undefined);
  mocks.login.mockResolvedValue({ token: "access-2", refreshToken: "refresh-2", user: { ...stored.user, id: 2, name: "Conta B" } });
});

describe("persistent authentication", () => {
  it("restores the local profile and persists refresh tokens before later profile edits", async () => {
    render(<AuthProvider><State /></AuthProvider>);
    await screen.findByText("Conta A");
    const adapter = vi.mocked(configureApiAuth).mock.calls.find(([value]) => value !== null)![0]!;
    await act(async () => { await adapter.onRefresh({ token: "rotated", refreshToken: "rotated-refresh" }, { token: "access-1", refreshToken: "refresh-1" }); });
    await act(async () => { await auth.setUser({ ...stored.user, name: "Perfil atualizado" }); });
    expect(mocks.save.mock.lastCall?.[0]).toMatchObject({ token: "rotated", refreshToken: "rotated-refresh", user: { name: "Perfil atualizado" } });
  });

  it("ignores a refresh from the previous account after logout and login", async () => {
    render(<AuthProvider><State /></AuthProvider>);
    await screen.findByText("Conta A");
    const adapter = vi.mocked(configureApiAuth).mock.calls.find(([value]) => value !== null)![0]!;
    await act(async () => { await auth.signOut(); await auth.signIn({ email: "b@example.com", password: "Password@1" }); });
    await screen.findByText("Conta B");
    await act(async () => { await adapter.onRefresh({ token: "old-refreshed" }, { token: "access-1" }); });
    expect(auth.token).toBe("access-2");
    expect(auth.user.id).toBe(2);
    expect(mocks.clear).toHaveBeenCalledWith(1);
  });

  it("keeps a recoverable startup error instead of silently deleting saved data", async () => {
    mocks.load.mockRejectedValueOnce(new Error("storage unavailable"));
    render(<AuthProvider><State /></AuthProvider>);
    await screen.findByText(/Nao foi possivel abrir os dados salvos/);
    expect(mocks.clear).not.toHaveBeenCalled();
    act(() => auth.retryStartup());
    await screen.findByText("Conta A");
  });

  it("retains pending local data on session expiration", async () => {
    render(<AuthProvider><State /></AuthProvider>);
    await screen.findByText("Conta A");
    const adapter = vi.mocked(configureApiAuth).mock.calls.find(([value]) => value !== null)![0]!;
    await act(async () => { await adapter.onExpire({ token: "access-1" }); });
    await waitFor(() => expect(auth.token).toBe(""));
    expect(mocks.clear).toHaveBeenCalledWith(undefined);
  });
});
