import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

/** Route guard: sends anonymous visitors to the login screen. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/entrar" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
