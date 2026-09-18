import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";

import * as authApi from "./api/auth-api";
import type { AccountType, AuthOrganization, AuthUser, LoginInput, SignupInput } from "./types";
import { configureApiAuth } from "../../shared/api/client";

type StoredSession = {
  token: string;
  refreshToken?: string;
  organization?: AuthOrganization;
  user: AuthUser;
  workspaceMode: AccountType;
};
type AuthContextValue = StoredSession & {
  loading: boolean;
  modeTransition: Animated.Value;
  setWorkspaceMode: (mode: AccountType) => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
};

const STORAGE_KEY = "schedra.session";
const emptySession: StoredSession = { token: "", user: null as unknown as AuthUser, workspaceMode: "business" };
const AuthContext = createContext<AuthContextValue | null>(null);

const sessionStorage = {
  get: () => Platform.OS === "web" ? AsyncStorage.getItem(STORAGE_KEY) : SecureStore.getItemAsync(STORAGE_KEY),
  set: (value: string) => Platform.OS === "web" ? AsyncStorage.setItem(STORAGE_KEY, value) : SecureStore.setItemAsync(STORAGE_KEY, value),
  remove: () => Platform.OS === "web" ? AsyncStorage.removeItem(STORAGE_KEY) : SecureStore.deleteItemAsync(STORAGE_KEY),
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession>(emptySession);
  const [loading, setLoading] = useState(true);
  const modeTransition = useRef(new Animated.Value(0)).current;
  const modeTransitionLocked = useRef(false);

  useEffect(() => {
    sessionStorage.get().then((stored) => {
      if (!stored) return;
      try {
        const restored = JSON.parse(stored) as Partial<StoredSession> & Pick<StoredSession, "token" | "user">;
        if (!restored.token || !restored.user) return;
        setSession({ ...restored, workspaceMode: restored.workspaceMode ?? restored.user.accountType ?? "business" });
      } catch {
        void sessionStorage.remove();
      }
    }).finally(() => setLoading(false));

    configureApiAuth({
      getSession: async () => {
        const stored = await sessionStorage.get();
        if (!stored) return null;
        try {
          const parsed = JSON.parse(stored) as StoredSession;
          return { token: parsed.token, refreshToken: parsed.refreshToken };
        } catch {
          return null;
        }
      },
      onRefresh: async (payload) => {
        const stored = await sessionStorage.get();
        if (!stored) return;
        const previous = JSON.parse(stored) as StoredSession;
        const next = {
          ...previous,
          token: payload.token,
          refreshToken: payload.refreshToken,
          user: (payload.user as AuthUser | undefined) ?? previous.user,
          organization: (payload.organization as AuthOrganization | undefined) ?? previous.organization,
        };
        setSession(next);
        await sessionStorage.set(JSON.stringify(next));
      },
      onExpire: async () => {
        setSession(emptySession);
        await sessionStorage.remove();
      },
    });
  }, []);

  const persist = async (nextSession: StoredSession) => {
    setSession(nextSession);
    await sessionStorage.set(JSON.stringify(nextSession));
  };

  const value = useMemo<AuthContextValue>(() => ({
    ...session,
    loading,
    modeTransition,
    setWorkspaceMode: async (workspaceMode) => {
      if (workspaceMode === session.workspaceMode || modeTransitionLocked.current) return;
      modeTransitionLocked.current = true;
      const direction = session.workspaceMode === "business" ? -1 : 1;

      await new Promise<void>((resolve) => {
        Animated.timing(modeTransition, {
          toValue: direction,
          duration: 210,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(async () => {
          modeTransition.setValue(-direction);
          try {
            await persist({ ...session, workspaceMode });
          } catch {
            setSession({ ...session, workspaceMode });
          }
          Animated.timing(modeTransition, {
            toValue: 0,
            duration: 270,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            modeTransitionLocked.current = false;
            resolve();
          });
        });
      });
    },
    signIn: async (input) => {
      const response = await authApi.login(input);
      await persist({
        token: response.token,
        refreshToken: response.refreshToken,
        organization: response.organization,
        user: response.user,
        workspaceMode: "business",
      });
    },
    signUp: async (input) => {
      await authApi.signup(input);
      const response = await authApi.login({
        email: input.email,
        password: input.password,
      });
      await persist({
        token: response.token,
        refreshToken: response.refreshToken,
        organization: response.organization,
        user: response.user,
        workspaceMode: "business",
      });
    },
    signOut: async () => {
      if (session.token) await authApi.logout(session.token).catch(() => undefined);
      setSession(emptySession);
      await sessionStorage.remove();
    },
    setUser: async (user) => persist({ ...session, user }),
  }), [loading, modeTransition, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
