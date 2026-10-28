import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT } from "@/shared/api/http";
import * as authApi from "./api";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type AuthUser,
  type SignupInput,
} from "./auth-context";

/**
 * Holds the logged-in user for the whole app. The session itself is an
 * httpOnly cookie set by the API, so the login survives closing the browser;
 * when any request answers 401 the user is sent back to the logged-out state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const applyUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi
      .getSessionUser()
      .catch(() => null)
      .then((sessionUser) => {
        if (!cancelled) applyUser(sessionUser);
      });
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  useEffect(() => {
    const handleExpired = () => applyUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [applyUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const loggedUser = await authApi.login(email, password);
      applyUser(loggedUser);
      return loggedUser;
    },
    [applyUser]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const createdUser = await authApi.signup(input);
      applyUser(createdUser);
      return createdUser;
    },
    [applyUser]
  );

  const logout = useCallback(() => {
    void authApi.logout();
    applyUser(null);
  }, [applyUser]);

  const refreshUser = useCallback(async () => {
    applyUser(await authApi.getSessionUser());
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: user !== null,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, status, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
