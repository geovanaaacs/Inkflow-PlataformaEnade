import type { UserRole } from "./api";

/** Home screen of each profile (routes in src/app/(app)/). */
export function homeFor(role: UserRole): "/aluno" | "/professor" | "/admin" {
  return `/${role}`;
}
