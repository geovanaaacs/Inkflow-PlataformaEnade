import { CalendarClock, CheckCircle2, ListChecks, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/shared/api/api-error";
import { useAsync } from "@/shared/hooks/useAsync";
import { getTeacherOverview } from "./api";
import { MostMissedCard } from "./components/MostMissedCard";
import { StudentAnswersTable } from "./components/StudentAnswersTable";
import { TeacherStat } from "./components/TeacherStat";

/** /professor — how students are doing on the question bank. */
export function TeacherDashboardPage() {
  const { user } = useAuth();
  const { data: overview, loading, error, reload } = useAsync(getTeacherOverview, []);

  if (loading && !overview) {
    return <Spinner label="Carregando dashboard…" className="min-h-[50vh]" />;
  }

  if (error || !overview) {
    return (
      <Container as="div" className="flex flex-col items-center gap-3 py-16 text-sm text-ink-muted">
        {errorMessage(error, "Não foi possível carregar o dashboard.")}
        <Button size="sm" variant="outline" onClick={reload}>
          Tentar novamente
        </Button>
      </Container>
    );
  }

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">Dashboard do professor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Olá, {user?.name}. Acompanhe as questões respondidas pelos alunos.
        </p>
      </div>

      {overview.pendingRequests > 0 && (
        <Link
          to="/professor/agenda"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-4 text-white transition-opacity hover:opacity-95"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock aria-hidden="true" className="size-5" />
            {overview.pendingRequests}{" "}
            {overview.pendingRequests === 1
              ? "solicitação de mentoria aguardando sua resposta"
              : "solicitações de mentoria aguardando sua resposta"}
          </span>
          <span className="text-sm font-semibold">Abrir agenda →</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TeacherStat
          icon={<ListChecks />}
          value={String(overview.totalAnswers)}
          label="Respostas registradas"
        />
        <TeacherStat
          icon={<Users />}
          value={String(overview.activeStudents)}
          label="Alunos ativos"
        />
        <TeacherStat
          icon={<CheckCircle2 />}
          tone="success"
          value={`${overview.accuracyPercent}%`}
          label="Taxa de acerto (1ª tentativa)"
        />
        <TeacherStat
          icon={<CalendarClock />}
          tone="warning"
          value={String(overview.answersToday)}
          label="Respostas hoje"
        />
      </div>

      <MostMissedCard questions={overview.mostMissed} />

      <StudentAnswersTable
        rows={overview.rows}
        students={overview.students}
        areas={overview.areas}
      />
    </Container>
  );
}

export default TeacherDashboardPage;
