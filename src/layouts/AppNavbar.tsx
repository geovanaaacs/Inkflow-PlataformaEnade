import { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Logo } from "@/design-system/components/Logo";
import { useAuth, type UserRole } from "@/features/auth/auth-context";
import { homePathFor } from "@/features/auth/role-home";
import { LogoutModal } from "@/shared/modals/LogoutModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/components/Tooltip";
import {
  PLAN_LABEL,
  hasFeature,
  requiredPlanFor,
  type FeatureKey,
} from "@/shared/plans/plan-access";

interface NavItem {
  to: string;
  label: string;
  /** Only highlight on the exact path (e.g. "/professor" vs "/professor/agenda"). */
  exact?: boolean;
  /** Plan feature behind this page — shown with a lock when the user lacks it. */
  feature?: FeatureKey;
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  aluno: [
    { to: "/questoes", label: "Questões" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/simulados", label: "Simulados", feature: "mockExams" },
    { to: "/mentoria", label: "Mentoria", feature: "mentoring" },
  ],
  professor: [
    { to: "/professor", label: "Dashboard", exact: true },
    { to: "/questoes", label: "Questões" },
    { to: "/professor/agenda", label: "Agenda" },
  ],
  admin: [
    { to: "/admin/usuarios", label: "Usuários" },
    { to: "/admin/questoes", label: "Questões" },
    { to: "/admin/simulados", label: "Simulados" },
  ],
};

function isActivePath(pathname: string, item: NavItem): boolean {
  return pathname === item.to || (!item.exact && pathname.startsWith(`${item.to}/`));
}

/** Top navigation for authenticated app screens — items depend on the user's profile. */
export function AppNavbar() {
  const location = useLocation();
  const { user } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const role = user?.role ?? "aluno";
  const navItems = navItemsByRole[role];
  const homePath = homePathFor(role);

  function renderItem(item: NavItem, mobile: boolean) {
    const isActive = isActivePath(location.pathname, item);
    const lockedBehind =
      item.feature && !hasFeature(user?.plan, item.feature) ? requiredPlanFor(item.feature) : null;

    return (
      <Button
        to={item.to}
        variant={isActive ? "primary" : "ghost"}
        active={mobile ? isActive : undefined}
        size="sm"
        className={mobile ? undefined : "sm:h-[40px] sm:px-8 sm:text-base"}
        aria-label={
          lockedBehind ? `${item.label} (requer plano ${PLAN_LABEL[lockedBehind]})` : undefined
        }
        trailingIcon={
          lockedBehind ? <Lock aria-hidden="true" className="size-3.5 opacity-70" /> : undefined
        }
      >
        {item.label}
      </Button>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border-navbar bg-app-bg">
      <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-16">
        <Link to={homePath} aria-label="Inkflow — página inicial da sua área">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-2">
            {navItems.map((item) => (
              <li key={item.to}>{renderItem(item, false)}</li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            to="/perfil"
            variant={location.pathname.startsWith("/perfil") ? "primary" : "ghost"}
            size="sm"
            className="sm:h-[40px] sm:px-8 sm:text-base"
          >
            Perfil
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="danger"
                size="sm"
                aria-label="Sair do Inkflow"
                className="aspect-square px-0 sm:h-[40px]"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              Sair do Inkflow
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <nav aria-label="Principal" className="border-t border-border-navbar px-4 py-2 lg:hidden">
        <ul className="flex w-full items-center gap-2 overflow-x-auto sm:justify-center">
          {navItems.map((item) => (
            <li key={item.to} className="shrink-0">
              {renderItem(item, true)}
            </li>
          ))}
        </ul>
      </nav>

      <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </header>
  );
}
