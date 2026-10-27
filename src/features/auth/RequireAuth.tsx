import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/design-system/components/Spinner";
import type { ReturnToState } from "@/shared/navigation/return-to";
import { useAuth, type UserRole } from "./auth-context";
import { homePathFor } from "./role-home";

interface RequireAuthProps {
  /** Profiles allowed on the nested routes. Omit to allow any logged-in user. */
  roles?: UserRole[];
}

/**
 * Route guard: sends anonymous visitors to the login screen and users of the
 * wrong profile (aluno × professor) back to their own home.
 */
export function RequireAuth({ roles }: RequireAuthProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <Spinner label="Carregando sua sessão…" className="min-h-[60vh]" />;
  }

  if (!user) {
    const state: ReturnToState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/entrar" replace state={state} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}
