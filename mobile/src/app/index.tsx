import { Redirect } from "expo-router";
import { LoadingScreen } from "../components/ui";
import { useAuth } from "../features/auth/AuthProvider";
import { homeFor } from "../features/auth/home-route";

/** Entry point: sends the user to the login or to their profile's home. */
export default function Index() {
  const { status, user } = useAuth();
  if (status === "loading") return <LoadingScreen />;
  return <Redirect href={user ? homeFor(user.role) : "/login"} />;
}
