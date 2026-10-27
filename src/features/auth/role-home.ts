import type { UserRole } from "./auth-context";

/** Landing route of each profile after login (and when hitting the other profile's routes). */
export function homePathFor(role: UserRole): string {
  return role === "professor" ? "/professor" : "/dashboard";
}
