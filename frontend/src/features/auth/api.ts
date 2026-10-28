import { ApiError } from "@/shared/api/api-error";
import { http } from "@/shared/api/http";
import type { AuthUser, SignupInput } from "./auth-context";

/*
 * Auth API:
 *   POST /api/auth/login · POST /api/auth/register · POST /api/auth/logout · GET /api/me
 * The session is an httpOnly cookie set by the server, so the front never
 * stores a token: getSessionUser() asks the API who is logged in.
 */

export function login(email: string, password: string): Promise<AuthUser> {
  return http.post<AuthUser>("/auth/login", { email: email.trim(), password });
}

export function signup(input: SignupInput): Promise<AuthUser> {
  return http.post<AuthUser>("/auth/register", { ...input, name: input.name.trim(), email: input.email.trim() });
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout");
}

/** Current session user, or null when nobody is logged in. */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    return await http.get<AuthUser>("/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
