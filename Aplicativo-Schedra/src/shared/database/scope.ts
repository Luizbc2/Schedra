import type { Scope, PersistedSession } from "./types";

export const accountScope = (userId: number): Scope => ({ id: `account:${userId}`, userId, organizationId: null, mode: "account" });
export const personalScope = (userId: number): Scope => ({ id: `personal:${userId}`, userId, organizationId: null, mode: "personal" });
export const businessScope = (session: { user: { id: number }; organization?: { id: number } }): Scope => ({
  id: `business:${session.user.id}:${session.organization?.id ?? "private"}`,
  userId: session.user.id,
  organizationId: session.organization?.id ?? null,
  mode: "business",
});

export class SessionChangedError extends Error {
  constructor() { super("Sua sessao mudou. Abra a tela novamente."); }
}

type DataSession = { session: PersistedSession; generation: number; tokens: Set<string> };
let active: DataSession | undefined;
let generation = 0;

export function activateDataSession(session: PersistedSession | null) {
  const same = active && session && active.session.user.id === session.user.id
    && active.session.organization?.id === session.organization?.id && active.session.workspaceMode === session.workspaceMode;
  if (same) {
    active!.session = session!;
    active!.tokens.add(session!.token);
  } else {
    generation++;
    active = session ? { session, generation, tokens: new Set([session.token]) } : undefined;
  }
}

export function captureDataSession(token: string, personal = false) {
  if (!active?.tokens.has(token)) throw new SessionChangedError();
  const captured = active;
  const scope = personal ? personalScope(captured.session.user.id) : businessScope(captured.session);
  return {
    scope,
    userId: captured.session.user.id,
    assertCurrent: () => { if (active?.generation !== captured.generation) throw new SessionChangedError(); },
  };
}
