import { Clock, ListChecks, Lock } from "lucide-react";
import { Badge, type BadgeTone } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { useReturnToState } from "@/shared/navigation/return-to";
import { formatRelativeDay } from "@/shared/utils/dates";
import type { MockExamSummary } from "../api";
import type { ExamDifficulty } from "../data";

const difficultyTone: Record<ExamDifficulty, BadgeTone> = {
  fácil: "success",
  médio: "warning",
  difícil: "danger",
};

interface MockExamCardProps {
  exam: MockExamSummary;
  locked: boolean;
}

export function MockExamCard({ exam, locked }: MockExamCardProps) {
  const returnState = useReturnToState();
  const headingId = `exam-${exam.id}-heading`;

  return (
    <Card as="article" aria-labelledby={headingId} className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone={difficultyTone[exam.difficulty]}>Nível {exam.difficulty}</Badge>
        <Badge tone="neutral">{exam.areaName ?? "Várias áreas"}</Badge>
      </div>

      <div>
        <h2 id={headingId} className="text-lg font-semibold text-ink-strong">
          {exam.title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{exam.description}</p>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-strong">
        <li className="flex items-center gap-1.5">
          <ListChecks aria-hidden="true" className="size-4 text-brand-800" />
          {exam.questionCount} questões
        </li>
        <li className="flex items-center gap-1.5">
          <Clock aria-hidden="true" className="size-4 text-brand-800" />
          {exam.timeLimitMinutes} min
        </li>
      </ul>

      {exam.lastResult && (
        <p className="text-sm text-ink-muted">
          Última tentativa ({formatRelativeDay(exam.lastResult.finishedAt).toLowerCase()}):{" "}
          <span className="font-semibold text-ink-strong">
            {exam.lastResult.correctCount}/{exam.lastResult.total} acertos
          </span>
          {exam.lastResult.status === "expirado" && " · tempo esgotado"}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-3">
        {locked ? (
          <Button
            variant="outline"
            fullWidth
            disabled
            leadingIcon={<Lock aria-hidden="true" className="size-4" />}
          >
            Exclusivo Premium
          </Button>
        ) : (
          <>
            <Button to={`/simulados/${exam.id}`} className="flex-1">
              {exam.activeAttemptId ? "Continuar simulado" : "Começar simulado"}
            </Button>
            {exam.lastResult && (
              <Button
                to={`/simulados/resultado/${exam.lastResult.attemptId}`}
                state={returnState}
                variant="outline"
              >
                Ver resultado
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
