import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, AppState, Easing, Platform } from "react-native";

import * as authApi from "./api/auth-api";
import type { AccountType, AuthUser, LoginInput, SignupInput } from "./types";
import { configureApiAuth } from "../../shared/api/client";
import { sessionStore, pendingOperations } from "../../shared/database/session";
import { activateDataSession, SessionChangedError } from "../../shared/database/scope";
import type { PersistedSession } from "../../shared/database/types";
import { avatars, saveLocalAvatar } from "../../shared/media/avatar-service";
import { syncAvatar } from "../../shared/media/sync-avatar";
import { subscribeAvatar } from "../../shared/media/avatar-events";
import { isOnline, subscribeNetwork } from "../../shared/network/connection";
import { resolveApiAsset } from "../../shared/api/client";

type AuthContextValue = PersistedSession & {
  loading: boolean;
  startupError: string;
  retryStartup: () => void;
  modeTransition: Animated.Value;
  setWorkspaceMode: (mode: AccountType) => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
};

const emptySession: PersistedSession = { token: "", user: null as unknown as AuthUser, workspaceMode: "business" };
const AuthContext = createContext<AuthContextValue | null>(null);

function confirmDiscard() {
  const message = "Ha alteracoes aguardando envio. Ao sair, os dados deste aparelho serao apagados. Deseja descartar as pendencias?";
  if (Platform.OS === "web") return Promise.resolve(window.confirm(message));
  return new Promise<boolean>((resolve) => Alert.alert("Alteracoes pendentes", message, [
    { text: "Continuar na conta", style: "cancel", onPress: () => resolve(false) },
    { text: "Descartar e sair", style: "destructive", onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<PersistedSession>(emptySession);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [startupAttempt, setStartupAttempt] = useState(0);
  const current = useRef(session);
  const generation = useRef(0);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const modeTransition = useRef(new Animated.Value(0)).current;
  const modeTransitionLocked = useRef(false);

  const publish = useCallback((next: PersistedSession) => {
    current.current = next;
    activateDataSession(next.token ? next : null);
    setSession(next);
  }, []);

  const persist = useCallback((update: (previous: PersistedSession) => PersistedSession, expectedGeneration = generation.current) => {
    const next = writes.current.then(async () => {
      if (expectedGeneration !== generation.current) throw new SessionChangedError();
      const nextSession = update(current.current);
      await sessionStore.save(nextSession);
      if (expectedGeneration !== generation.current) throw new SessionChangedError();
      publish(nextSession);
    });
    writes.current = next.catch(() => undefined);
    return next;
  }, [publish]);

  const clearSession = useCallback(async (purge = true) => {
    const previous = current.current;
    generation.current++;
    publish(emptySession);
    const cleanup = writes.current.then(() => sessionStore.clear(purge ? previous.user?.id : undefined));
    writes.current = cleanup.catch(() => undefined);
    await cleanup;
  }, [publish]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setStartupError("");
    void sessionStore.load().then((stored) => { if (active) publish(stored ?? emptySession); })
      .catch(() => { if (active) setStartupError("Nao foi possivel abrir os dados salvos. Tente novamente; seus dados foram preservados."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [publish, startupAttempt]);

  useEffect(() => {
    configureApiAuth({
      getSession: async () => current.current.token ? { token: current.current.token, refreshToken: current.current.refreshToken } : null,
      onRefresh: async (payload, previous) => {
        if (current.current.token !== previous.token) return;
        await persist((stored) => ({
          ...stored, token: payload.token, refreshToken: payload.refreshToken,
          user: (payload.user as AuthUser | undefined) ?? stored.user,
          organization: (payload.organization as PersistedSession["organization"]) ?? stored.organization,
        }));
      },
      onExpire: async (previous) => { if (current.current.token === previous.token) await clearSession(false); },
    });
    return () => configureApiAuth(null);
  }, [clearSession, persist]);

  const signIn = useCallback(async (input: LoginInput) => {
    const expected = generation.current;
    const response = await authApi.login(input);
    await persist(() => ({ ...response, workspaceMode: "business" }), expected);
  }, [persist]);

  useEffect(() => {
    if (!session.token || !session.user) return;
    let active = true;
    let busy = false;
    let remoteChecked = false;
    const run = async () => {
      if (!active || busy || AppState.currentState === "background") return;
      busy = true;
      try {
        if (!(await isOnline())) return;
        const user = await syncAvatar(session.token);
        if (active && user) await persist((previous) => {
          if (previous.user?.id !== user.id) throw new SessionChangedError();
          return { ...previous, user: { ...previous.user, avatarUrl: user.avatarUrl } };
        });
        const previous = current.current;
        if (active && !remoteChecked && previous.user?.id === session.user.id && previous.user.avatarUrl) {
          remoteChecked = true;
          if (!(await avatars.get(previous.user.id))) {
            let timeout: ReturnType<typeof setTimeout> | undefined;
            try {
              await Promise.race([
                saveLocalAvatar(previous.token, resolveApiAsset(previous.user.avatarUrl)!, undefined, previous.user.avatarUrl),
                new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Tempo de leitura da foto excedido.")), 10000); }),
              ]);
            } finally { clearTimeout(timeout); }
          }
        }
      } catch { /* Keep the durable queue; retry on foreground, reconnect or the next timer. */ }
      finally { busy = false; }
    };
    void run();
    const interval = setInterval(() => void run(), 5000);
    const unsubscribe = subscribeAvatar(() => void run());
    const offline = subscribeNetwork(() => void run());
    const appState = AppState.addEventListener("change", (state) => { if (state === "active") void run(); });
    return () => { active = false; clearInterval(interval); unsubscribe(); offline(); appState.remove(); };
  }, [persist, session.token, session.user?.id]);

  const value = useMemo<AuthContextValue>(() => ({
    ...session, loading, startupError, retryStartup: () => setStartupAttempt((value) => value + 1), modeTransition,
    setWorkspaceMode: async (workspaceMode) => {
      if (workspaceMode === current.current.workspaceMode || modeTransitionLocked.current) return;
      modeTransitionLocked.current = true;
      const expected = generation.current;
      const direction = current.current.workspaceMode === "business" ? -1 : 1;
      await new Promise<void>((resolve) => {
        Animated.timing(modeTransition, { toValue: direction, duration: 210, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(async () => {
          modeTransition.setValue(-direction);
          try { await persist((previous) => ({ ...previous, workspaceMode }), expected); }
          catch { Alert.alert("Modo de uso", "Nao foi possivel salvar a alteracao. Tente novamente."); }
          Animated.timing(modeTransition, { toValue: 0, duration: 270, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
            modeTransitionLocked.current = false;
            resolve();
          });
        });
      });
    },
    signIn,
    signUp: async (input) => { await authApi.signup(input); await signIn({ email: input.email, password: input.password }); },
    signOut: async () => {
      const previous = current.current;
      const expected = generation.current;
      if (previous.user && await pendingOperations(previous.user.id) > 0 && !(await confirmDiscard())) return;
      if (expected !== generation.current || current.current.user?.id !== previous.user?.id) return;
      if (previous.token) void authApi.logout(previous.token).catch(() => undefined);
      await clearSession();
    },
    setUser: async (user) => persist((previous) => {
      if (previous.user?.id !== user.id) throw new SessionChangedError();
      return { ...previous, user };
    }),
  }), [clearSession, loading, modeTransition, persist, session, signIn, startupError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
