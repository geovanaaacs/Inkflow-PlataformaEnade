import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import type { AnswerSummary } from "@/features/questions/api";
import { useReturnToState } from "@/shared/navigation/return-to";
import { formatRelativeDay } from "@/shared/utils/dates";

interface RecentAnswersCardProps {
  answers: AnswerSummary[];
  /** Free plan: invites to upgrade for the full history. */
  showHistoryUpsell: boolean;
}

export function RecentAnswersCard({ answers, showHistoryUpsell }: RecentAnswersCardProps) {
  const returnState = useReturnToState();

  return (
    <Card as="section" aria-labelledby="recent-answers-heading" className="flex flex-col">
      <h2 id="recent-answers-heading" className="text-lg font-semibold text-ink-strong">
        Meus acertos e erros
      </h2>

      {answers.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          Você ainda não respondeu nenhuma questão. Que tal começar agora?
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {answers.map((answer) => (
            <li
              key={answer.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                {answer.correct ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
                )}
                <div>
                  <p className="text-sm font-semibold text-ink-strong">
                    {answer.questionCode}
                    <span className="sr-only">{answer.correct ? " — acertou" : " — errou"}</span>
                  </p>
                  <p className="text-sm text-ink-muted">{answer.topic}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-muted">
                  {formatRelativeDay(answer.answeredAt)}
                </span>
                <Button
                  to={`/questoes/${answer.questionCode}`}
                  state={returnState}
                  variant="outline"
                  size="sm"
                  aria-label={`Revisar questão ${answer.questionCode}`}
                >
                  Revisar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showHistoryUpsell && (
        <Button to="/planos" state={returnState} variant="outline" fullWidth className="mt-6">
          Ver histórico completo (Plano Avançado)
        </Button>
      )}
    </Card>
  );
}
