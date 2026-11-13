import { http } from "../../lib/http";

/*
 * Auth API (mobile):
 *   POST /api/auth/mobile/login · POST /api/auth/mobile/register → { token, expiresAt, user }
 *   GET  /api/me (with the Bearer token)
 * There is no logout call: the token is stateless, the app just deletes it.
 */

export type UserRole = "aluno" | "professor" | "admin";
export type PlanId = "basico" | "avancado" | "premium";

/** Same shape as AuthUser on the web front. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Students only; null for teachers and admins. */
  plan: PlanId | null;
  course: string | null;
  /** Profile photo as a data URL, or null. */
  photoUrl: string | null;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  /** Admins are only created by another admin. */
  role: Exclude<UserRole, "admin">;
}

export interface TokenResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return http.post<TokenResponse>("/auth/mobile/login", { email: email.trim(), password });
}

export function signup(input: SignupInput): Promise<TokenResponse> {
  return http.post<TokenResponse>("/auth/mobile/register", {
    ...input,
    name: input.name.trim(),
    email: input.email.trim(),
  });
}

export function getSessionUser(): Promise<AuthUser> {
  return http.get<AuthUser>("/me");
}

export interface ProfileInput {
  name: string;
  email: string;
  course: string | null;
}

/** PATCH /api/me → the updated user. */
export function updateProfile(input: ProfileInput): Promise<AuthUser> {
  return http.patch<AuthUser>("/me", {
    name: input.name.trim(),
    email: input.email.trim(),
    course: input.course?.trim() || null,
  });
}

/** POST /api/me/password (asks for the current password). */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return http.post("/me/password", { currentPassword, newPassword });
}

/** PUT /api/me/photo with a data URL ("data:image/jpeg;base64,..."). */
export function uploadPhoto(photo: string): Promise<AuthUser> {
  return http.put<AuthUser>("/me/photo", { photo });
}

export function removePhoto(): Promise<AuthUser> {
  return http.delete<AuthUser>("/me/photo");
}
