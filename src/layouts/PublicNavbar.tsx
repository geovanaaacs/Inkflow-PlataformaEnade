import { Link } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Logo } from "@/design-system/components/Logo";

/** Top navigation for unauthenticated pages (landing, plans). */
export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-navbar bg-app-bg">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-[75px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-16"
      >
        <Link
          to="/"
          className="flex h-full items-center rounded-button focus-visible:outline-none"
          aria-label="Inkflow — página inicial"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <Button to="/entrar" variant="outline" size="md">
            Entrar
          </Button>
          <Button to="/entrar?modo=cadastro" size="md" className="hidden sm:inline-flex">
            Comece grátis
          </Button>
        </div>
      </nav>
    </header>
  );
}
