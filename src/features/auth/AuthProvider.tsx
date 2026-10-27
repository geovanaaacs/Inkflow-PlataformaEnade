import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "./api";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type AuthUser,
  type SignupInput,
} from "./auth-context";

/**
 * Holds the logged-in user for the whole app. The session itself lives in
 * `auth/api.ts` (persisted in localStorage by the mock, an httpOnly cookie
 * once the backend exists), so the login survives closing the browser.
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
