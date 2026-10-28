import type { UserRole } from "./auth-context";

const HOME_BY_ROLE: Record<UserRole, string> = {
  aluno: "/dashboard",
  professor: "/professor",
  admin: "/admin/usuarios",
};

/** Landing route of each profile after login (and when hitting another profile's routes). */
export function homePathFor(role: UserRole): string {
  return HOME_BY_ROLE[role];
}
