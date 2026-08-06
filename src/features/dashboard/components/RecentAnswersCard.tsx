import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import type { RecentAnswer } from "../data";

interface RecentAnswersCardProps {
  answers: RecentAnswer[];
}

export function RecentAnswersCard({ answers }: RecentAnswersCardProps) {
  return (
    <Card as="section" aria-labelledby="recent-answers-heading" className="flex flex-col">
      <h2 id="recent-answers-heading" className="text-lg font-semibold text-ink-strong">
        Meus acertos e erros
      </h2>

      <ul className="mt-6 flex flex-col gap-4">
        {answers.map((answer) => (
          <li
            key={answer.code}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              {answer.correct ? (
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
              )}
              <div>
                <p className="text-sm font-semibold text-ink-strong">{answer.code}</p>
                <p className="text-sm text-ink-muted">{answer.topic}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-muted">{answer.when}</span>
              <Button to={`/questoes?revisar=${answer.code}`} variant="outline" size="sm">
                Revisar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button to="/planos" variant="outline" fullWidth className="mt-6">
        Ver histórico completo (Plano Pro)
      </Button>
    </Card>
  );
}
