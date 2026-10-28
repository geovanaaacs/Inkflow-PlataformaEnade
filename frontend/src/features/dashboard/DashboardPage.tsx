import { useState } from "react";
import { Flame, ListChecks, Lock, NotebookPen, Target } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/shared/api/api-error";
import { PlanBanner } from "@/shared/components/PlanBanner";
import { UpsellBar } from "@/shared/components/UpsellBar";
import { useAsync } from "@/shared/hooks/useAsync";
import { hasFeature, requiredPlanFor, type FeatureKey } from "@/shared/plans/plan-access";
import { getDashboardOverview } from "./api";
import { AreaPerformanceCard } from "./components/AreaPerformanceCard";
import { MyNotesModal } from "./components/MyNotesModal";
import { RankingCard } from "./components/RankingCard";
import { RecentAnswersCard } from "./components/RecentAnswersCard";
import { StatCard } from "./components/StatCard";
import { SuggestedQuestionsGrid } from "./components/SuggestedQuestionsGrid";

/** Premium features teased at the bottom while the user doesn't have them. */
const upsellFeatures: { feature: FeatureKey; label: string }[] = [
  { feature: "mockExams", label: "Simulados com timer" },
  { feature: "mentoring", label: "Mentoria com professores" },
];

export function DashboardPage() {
  const { user } = useAuth();
  const plan = user?.plan ?? "basico";
  const [notesOpen, setNotesOpen] = useState(false);
  const { data: overview, loading, error, reload } = useAsync(getDashboardOverview, []);

  const notesUnlocked = hasFeature(plan, "notes");
  const lockedUpsells = upsellFeatures.filter(({ feature }) => !hasFeature(plan, feature));

  if (loading && !overview) {
    return <Spinner label="Carregando seu dashboard…" className="min-h-[50vh]" />;
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
      <h1 className="sr-only">Dashboard</h1>

      <PlanBanner planId={plan} usage={overview.dailyUsage} />

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard
          icon={<ListChecks className="size-[18px]" aria-hidden="true" />}
          value="247"
          label="Questões respondidas"
          progressPercent={30}
          delta="+12 esta semana"
        />
        <StatCard
          icon={<Target className="size-[18px]" aria-hidden="true" />}
          value="68%"
          label="Taxa de acerto geral"
          progressPercent={68}
          delta="+4% vs semana passada"
        />
        <StatCard
          icon={<Flame className="size-[18px]" aria-hidden="true" />}
          tone="danger"
          value="7"
          label="Streak de dias seguidos"
          progressPercent={33}
          progressTone="danger"
          delta="Melhor: 21 dias · Record pessoal!"
          deltaPositive={false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AreaPerformanceCard areas={overview.areaPerformance} />
          <Button
            fullWidth
            leadingIcon={<NotebookPen aria-hidden="true" className="size-4" />}
            trailingIcon={
              notesUnlocked ? undefined : <Lock aria-hidden="true" className="size-3.5 opacity-80" />
            }
            aria-label={
              notesUnlocked ? undefined : "Minhas anotações (requer plano Avançado)"
            }
            onClick={() => setNotesOpen(true)}
          >
            Minhas anotações
          </Button>
        </div>
        <RecentAnswersCard
          answers={overview.recentAnswers}
          showHistoryUpsell={!hasFeature(plan, "fullHistory")}
        />
      </div>

      <RankingCard plan={plan} />

      <SuggestedQuestionsGrid topics={overview.suggestedTopics} />

      {lockedUpsells.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {lockedUpsells.map(({ feature, label }) => (
            <UpsellBar key={feature} label={label} requiredPlan={requiredPlanFor(feature)} />
          ))}
        </div>
      )}

      <MyNotesModal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        unlocked={notesUnlocked}
      />
    </Container>
  );
}

export default DashboardPage;
