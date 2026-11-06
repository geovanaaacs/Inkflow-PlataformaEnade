import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, setSessionExpiredHandler } from "../../lib/http";
import { clearToken, readToken, saveToken } from "../../lib/token-storage";
import * as authApi from "./api";
import type { AuthUser, SignupInput } from "./api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Re-reads the session user (e.g. after a plan change). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  // On launch: a saved token means a previous login; check it is still valid.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await readToken();
      if (!token) {
        if (active) setStatus("anonymous");
        return;
      }
      try {
        const sessionUser = await authApi.getSessionUser();
        if (!active) return;
        setUser(sessionUser);
        setStatus("authenticated");
      } catch (error) {
        if (!active) return;
        // Expired/invalid token → log in again. Network errors also land on the
        // login screen, which shows the connection message on the next attempt.
        if (error instanceof ApiError && error.status === 401) await clearToken();
        setStatus("anonymous");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => void signOut());
    return () => setSessionExpiredHandler(null);
  }, [signOut]);

  const startSession = useCallback(async ({ token, user: sessionUser }: authApi.TokenResponse) => {
    await saveToken(token);
    setUser(sessionUser);
    setStatus("authenticated");
    return sessionUser;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: async (email, password) => startSession(await authApi.login(email, password)),
      signup: async (input) => startSession(await authApi.signup(input)),
      logout: signOut,
      refreshUser: async () => setUser(await authApi.getSessionUser()),
    }),
    [user, status, startSession, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
