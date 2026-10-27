import { createContext, useContext } from "react";
import type { PlanId } from "@/shared/plans/plan-access";

export type UserRole = "aluno" | "professor";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Subscription plan — students only; `null` for teachers. */
  plan: PlanId | null;
  course: string | null;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser>;
  logout: () => void;
  /** Re-reads the session user (e.g. after a plan change). */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
