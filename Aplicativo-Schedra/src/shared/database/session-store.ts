import type { AuthOrganization } from "../../features/auth/types";
import { accountScope } from "./scope";
import type { LocalDatabase, PersistedSession } from "./types";

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
type Credentials = Pick<PersistedSession, "token" | "refreshToken"> & { userId: number; organizationId?: number };
const KEY = "schedra.credentials.v2";
const LEGACY_KEY = "schedra.session";
const profileId = (userId: number, organizationId?: number) => `profile:${userId}:${organizationId ?? "private"}`;

export function createSessionStore(database: () => Promise<LocalDatabase>, secure: KeyValueStore) {
  return {
    async save(session: PersistedSession) {
      const db = await database();
      const scope = accountScope(session.user.id);
      const id = profileId(session.user.id, session.organization?.id);
      await db.write(async (tx) => {
        await tx.put("scopes", scope);
        const { id: userId, ...user } = session.user;
        await tx.put("profiles", { ...user, id, userId, scopeId: scope.id, organizationJson: session.organization ? JSON.stringify(session.organization) : null });
        await tx.put("preferences", { id: `workspace:${id}`, scopeId: scope.id, value: session.workspaceMode });
      });
      const credentials: Credentials = { token: session.token, refreshToken: session.refreshToken, userId: session.user.id, organizationId: session.organization?.id };
      await secure.set(KEY, JSON.stringify(credentials));
      await secure.remove(LEGACY_KEY);
    },
    async load(): Promise<PersistedSession | null> {
      const stored = await secure.get(KEY);
      if (stored) {
        const credentials = JSON.parse(stored) as Credentials;
        if (!credentials.token || !Number.isInteger(credentials.userId)) throw new Error("Sessao local invalida.");
        const id = profileId(credentials.userId, credentials.organizationId);
        const db = await database();
        const restored = await db.read(async (tx) => {
          const profile = await tx.get("profiles", id);
          if (!profile) return null;
          if (profile.userId !== credentials.userId) throw new Error("Nao foi possivel recuperar o perfil salvo.");
          const workspace = await tx.get("preferences", `workspace:${id}`);
          const { id: _, scopeId: __, userId, organizationJson, ...user } = profile;
          return {
            token: credentials.token,
            refreshToken: credentials.refreshToken,
            user: { ...user, id: userId },
            organization: organizationJson ? JSON.parse(organizationJson) as AuthOrganization : undefined,
            workspaceMode: workspace?.value === "personal" ? "personal" as const : "business" as const,
          };
        });
        // iOS may keep Keychain entries after reinstalling while the SQLite file is new.
        if (!restored) { await secure.remove(KEY); await secure.remove(LEGACY_KEY); }
        return restored;
      }
      const old = await secure.get(LEGACY_KEY);
      if (!old) return null;
      const legacy = JSON.parse(old) as PersistedSession;
      if (!legacy.token || !Number.isInteger(legacy.user?.id) || !legacy.user.email) throw new Error("Sessao anterior invalida.");
      const session = { ...legacy, workspaceMode: legacy.workspaceMode ?? legacy.user.accountType ?? "business" };
      await this.save(session);
      return session;
    },
    async clear(userId?: number) {
      // Revoke local credentials before removing data, so interruption cannot restore access.
      await secure.remove(KEY);
      await secure.remove(LEGACY_KEY);
      if (userId === undefined) return;
      const db = await database();
      await db.write(async (tx) => {
        const scopes = (await tx.all("scopes")).filter((scope) => scope.userId === userId);
        for (const scope of scopes) await tx.removeScope(scope.id);
      });
    },
  };
}
