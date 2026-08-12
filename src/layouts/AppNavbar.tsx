import { useState } from "react";
import { LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Logo } from "@/design-system/components/Logo";
import { LogoutModal } from "@/shared/modals/LogoutModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/components/Tooltip";


const navItems = [
  { to: "/questoes", label: "Questões" },
  { to: "/dashboard", label: "Dashboard" },
];

/** Top navigation for authenticated app screens. */
export function AppNavbar() {
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border-navbar bg-app-bg">
      <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-16">
        <Link to="/questoes" aria-label="Inkflow — página de questões">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Button
                    to={item.to}
                    variant={isActive ? "primary" : "ghost"}
                    size="sm"
                    className="sm:h-[40px] sm:px-8 sm:text-base"
                  >
                    {item.label}
                  </Button>
                </li>
              );
            })}
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

      <nav aria-label="Principal" className="border-t border-border-navbar px-4 py-2 md:hidden">
        <ul className="flex w-full justify-center items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <li key={item.to} className="shrink-0">
                <Button
                  to={item.to}
                  variant={isActive ? "primary" : "ghost"}
                  active={isActive}
                  size="sm"
                >
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </header>
  );
}
