import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openTestDatabase } from "./sqlite-helper";
import { cachedQuery } from "../../src/shared/database/cached-query";
import { ApiError } from "../../src/shared/api/client";
import { activateDataSession } from "../../src/shared/database/scope";
import type { LocalDatabase, PersistedSession } from "../../src/shared/database/types";

const dependencies = vi.hoisted(() => ({ online: vi.fn(), database: vi.fn() }));
vi.mock("../../src/shared/database/database", () => ({ getLocalDatabase: dependencies.database }));
vi.mock("../../src/shared/network/connection", () => ({ isOnline: dependencies.online }));
const session: PersistedSession = { token: "token", workspaceMode: "business", user: { id: 1, name: "Teste", email: "test@example.com", cpf: "", accountType: "business", role: "user", active: true, avatarUrl: null } };
const client = { id: 1, name: "Ana", email: "ana@example.com", phone: "11999999999", cpf: "", notes: "" };
let connection: Awaited<ReturnType<typeof openTestDatabase>>;
beforeEach(async () => { connection = await openTestDatabase(); dependencies.database.mockResolvedValue(connection.db); dependencies.online.mockResolvedValue(true); activateDataSession(session); });
afterEach(() => { connection.close(); activateDataSession(null); });

describe("cached queries", () => {
  it("opens the saved list offline without making an HTTP request", async () => {
    const load = vi.fn().mockResolvedValue([client]);
    await cachedQuery("clients", "token", load);
    dependencies.online.mockResolvedValue(false);
    const cached = await cachedQuery("clients", "token", load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(cached.data).toEqual([client]);
    expect(cached.local.source).toBe("device");
  });

  it("does not substitute cached data for 401/403 errors", async () => {
    await cachedQuery("clients", "token", async () => [client]);
    for (const status of [401, 403]) await expect(cachedQuery("clients", "token", async () => { throw new ApiError("Denied", status); })).rejects.toMatchObject({ status });
  });

  it("recovers on a network failure and removes remotely deleted records on refresh", async () => {
    await cachedQuery("clients", "token", async () => [client]);
    expect((await cachedQuery("clients", "token", async () => { throw new TypeError("Failed to fetch"); })).data).toEqual([client]);
    await cachedQuery("clients", "token", async () => []);
    dependencies.online.mockResolvedValue(false);
    expect((await cachedQuery("clients", "token", vi.fn())).data).toEqual([]);
  });
});
