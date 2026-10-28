import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingPage } from "@/features/landing/LandingPage";
import { AuthPage } from "@/features/auth/AuthPage";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { QuestionsPage } from "@/features/questions/QuestionsPage";
import { QuestionDetailPage } from "@/features/questions/QuestionDetailPage";
import { TopicQuestionsPage } from "@/features/questions/TopicQuestionsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { PlansPage } from "@/features/plans/PlansPage";
import { NotFoundPage } from "@/features/misc/NotFoundPage";
import { TeacherDashboardPage } from "@/features/teacher/TeacherDashboardPage";
import { TeacherAgendaPage } from "@/features/teacher/TeacherAgendaPage";
import { MockExamsPage } from "@/features/mock-exams/MockExamsPage";
import { MockExamRunnerPage } from "@/features/mock-exams/MockExamRunnerPage";
import { MockExamResultPage } from "@/features/mock-exams/MockExamResultPage";
import { MentoringPage } from "@/features/mentoring/MentoringPage";
import { AdminUsersPage } from "@/features/admin/AdminUsersPage";
import { AdminQuestionsPage } from "@/features/admin/AdminQuestionsPage";
import { AdminMockExamsPage } from "@/features/admin/AdminMockExamsPage";

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
              {/* Aluno e professor: responder questões */}
              <Route element={<RequireAuth roles={["aluno", "professor"]} />}>
                <Route path="/questoes" element={<QuestionsPage />} />
                <Route path="/questoes/tema/:area" element={<TopicQuestionsPage />} />
                <Route path="/questoes/:code" element={<QuestionDetailPage />} />
              </Route>

              {/* Aluno */}
              <Route element={<RequireAuth roles={["aluno"]} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/simulados" element={<MockExamsPage />} />
                <Route path="/simulados/resultado/:attemptId" element={<MockExamResultPage />} />
                <Route path="/simulados/:examId" element={<MockExamRunnerPage />} />
                <Route path="/mentoria" element={<MentoringPage />} />
              </Route>

              {/* Professor */}
              <Route element={<RequireAuth roles={["professor"]} />}>
                <Route path="/professor" element={<TeacherDashboardPage />} />
                <Route path="/professor/agenda" element={<TeacherAgendaPage />} />
              </Route>

              {/* Admin */}
              <Route element={<RequireAuth roles={["admin"]} />}>
                <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
                <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                <Route path="/admin/questoes" element={<AdminQuestionsPage />} />
                <Route path="/admin/simulados" element={<AdminMockExamsPage />} />
              </Route>

              {/* Todos os perfis */}
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
