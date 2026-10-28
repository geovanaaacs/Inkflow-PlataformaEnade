import { ApiError } from "@/shared/api/api-error";
import { COLLECTIONS } from "@/shared/api/collections";
import {
  createId,
  mockDelay,
  readCollection,
  readValue,
  updateCollection,
  writeValue,
} from "@/shared/api/mock-store";
import type { PlanId } from "@/shared/plans/plan-access";
import type { AuthUser, SignupInput } from "./auth-context";
import { mockUsers, type MockUserRecord } from "./data";

/*
 * Auth API (mock). Future endpoints:
 *   POST /api/auth/login · POST /api/auth/register · POST /api/auth/logout · GET /api/me
 * With a real backend the session becomes an httpOnly cookie, so the
 * "session" value below disappears and getSessionUser() calls GET /api/me.
 */

const USERS_KEY = COLLECTIONS.users;
const SESSION_KEY = "session";

interface MockSession {
  userId: string;
}

function readUsers(): MockUserRecord[] {
  return readCollection(USERS_KEY, () => mockUsers);
}

/** Public shape of a user — never exposes the password. */
function toAuthUser(record: MockUserRecord): AuthUser {
  const { id, name, email, role, plan, course } = record;
  return { id, name, email, role, plan, course };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Accounts deactivated by an admin can no longer log in or keep a session. */
export function isActiveAccount(record: { active?: boolean }): boolean {
  return record.active !== false;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  await mockDelay(400);
  const record = readUsers().find((user) => user.email === normalizeEmail(email));
  if (!record || record.password !== password) {
    throw new ApiError("E-mail ou senha inválidos.", 401);
  }
  if (!isActiveAccount(record)) {
    throw new ApiError("Esta conta está desativada. Fale com a administração do Inkflow.", 403);
  }
  writeValue<MockSession>(SESSION_KEY, { userId: record.id });
  return toAuthUser(record);
}

export async function signup(input: SignupInput): Promise<AuthUser> {
  await mockDelay(400);
  const email = normalizeEmail(input.email);
  if (readUsers().some((user) => user.email === email)) {
    throw new ApiError("Já existe uma conta com este e-mail.", 409);
  }

  const record: MockUserRecord = {
    id: createId("u"),
    name: input.name.trim(),
    email,
    password: input.password,
    role: input.role,
    plan: input.role === "aluno" ? "basico" : null,
    course: null,
  };
  updateCollection(USERS_KEY, () => mockUsers, (users) => [...users, record]);
  writeValue<MockSession>(SESSION_KEY, { userId: record.id });
  return toAuthUser(record);
}

export async function logout(): Promise<void> {
  writeValue<MockSession>(SESSION_KEY, null);
}

/** Current session user, or null when nobody is logged in. */
export async function getSessionUser(): Promise<AuthUser | null> {
  await mockDelay(100);
  const session = readValue<MockSession>(SESSION_KEY);
  if (!session) return null;
  const record = readUsers().find((user) => user.id === session.userId);
  return record && isActiveAccount(record) ? toAuthUser(record) : null;
}

/**
 * Mock-only: who is calling. Other feature `api.ts` files use it the way a
 * real endpoint reads the session cookie. Throws 401 when logged out.
 */
export function requireSessionUser(): AuthUser {
  const session = readValue<MockSession>(SESSION_KEY);
  const record = readUsers().find((user) => user.id === session?.userId);
  if (!record || !isActiveAccount(record)) {
    throw new ApiError("Sessão expirada. Entre novamente.", 401);
  }
  return toAuthUser(record);
}

/** Used by the simulated plan upgrade on the Planos page. */
export async function updateSessionUserPlan(plan: PlanId): Promise<AuthUser> {
  const session = readValue<MockSession>(SESSION_KEY);
  const users = readUsers();
  const record = users.find((user) => user.id === session?.userId);
  if (!record) throw new ApiError("Sessão expirada. Entre novamente.", 401);
  if (record.role !== "aluno") throw new ApiError("Apenas alunos assinam planos.", 403);

  const updated: MockUserRecord = { ...record, plan };
  updateCollection(USERS_KEY, () => mockUsers, (current) =>
    current.map((user) => (user.id === updated.id ? updated : user))
  );
  return toAuthUser(updated);
}

/** Directory of active accounts (id → name/role/plan), e.g. for rankings and teacher views. */
export async function listUsers(): Promise<AuthUser[]> {
  return readUsers().filter(isActiveAccount).map(toAuthUser);
}
