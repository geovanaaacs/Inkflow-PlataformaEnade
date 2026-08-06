import { Outlet } from "react-router-dom";
import { PublicNavbar } from "./PublicNavbar";

/** Shell for unauthenticated, marketing-facing routes. */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-app-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <PublicNavbar />
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
