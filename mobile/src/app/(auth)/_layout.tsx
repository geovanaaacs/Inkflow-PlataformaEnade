import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { homeFor } from "../../features/auth/home-route";

/** Login and signup: only for visitors; a logged-in user goes to their home. */
export default function AuthLayout() {
  const { status, user } = useAuth();
  if (status === "loading") return <LoadingScreen />;
  if (user) return <Redirect href={homeFor(user.role)} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
