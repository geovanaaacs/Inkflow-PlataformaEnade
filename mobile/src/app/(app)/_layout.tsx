import { Redirect, Stack, useSegments } from "expo-router";
import { LoadingScreen } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { homeFor } from "../../features/auth/home-route";
import type { UserRole } from "../../features/auth/api";

const ROLES: UserRole[] = ["aluno", "professor", "admin"];

/**
 * Logged-in area. Each profile has its own branch (/aluno, /professor,
 * /admin); opening another profile's branch sends the user back to theirs.
 * The API checks the profile again on every request.
 */
export default function AppLayout() {
  const { status, user } = useAuth();
  const segments = useSegments();

  if (status === "loading") return <LoadingScreen />;
  if (!user) return <Redirect href="/login" />;

  const branch = segments.find((segment): segment is UserRole => ROLES.includes(segment as UserRole));
  if (branch && branch !== user.role) return <Redirect href={homeFor(user.role)} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
