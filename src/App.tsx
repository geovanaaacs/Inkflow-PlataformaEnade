import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingPage } from "@/features/landing/LandingPage";
import { AuthPage } from "@/features/auth/AuthPage";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { QuestionsPage } from "@/features/questions/QuestionsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { PlansPage } from "@/features/plans/PlansPage";
import { NotFoundPage } from "@/features/misc/NotFoundPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="/planos" element={<PlansPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/entrar" element={<AuthPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/questoes" element={<QuestionsPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
