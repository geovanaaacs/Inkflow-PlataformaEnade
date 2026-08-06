import { Flame, ListChecks, NotebookPen, Target } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import { AreaPerformanceCard } from "./components/AreaPerformanceCard";
import { PlanBanner } from "./components/PlanBanner";
import { RecentAnswersCard } from "./components/RecentAnswersCard";
import { StatCard } from "./components/StatCard";
import { SuggestedQuestionsGrid } from "./components/SuggestedQuestionsGrid";
import { UpsellBar } from "./components/UpsellBar";
import { areaPerformance, recentAnswers, suggestedTopics } from "./data";

export function DashboardPage() {
  return (
    <Container as="div" className="flex flex-col gap-6">
      <h1 className="sr-only">Dashboard</h1>

      <PlanBanner planName="Plano Grátis" used={7} total={10} />

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
          <AreaPerformanceCard areas={areaPerformance} />
          <Button
            to="/questoes"
            fullWidth
            leadingIcon={<NotebookPen aria-hidden="true" className="size-4" />}
          >
            Minhas anotações
          </Button>
        </div>
        <RecentAnswersCard answers={recentAnswers} />
      </div>

      <SuggestedQuestionsGrid topics={suggestedTopics} />

      <div className="grid gap-4 sm:grid-cols-2">
        <UpsellBar label="Simulados" />
        <UpsellBar label="Ranking" />
      </div>
      <UpsellBar label="Professores" />
    </Container>
  );
}

export default DashboardPage;
