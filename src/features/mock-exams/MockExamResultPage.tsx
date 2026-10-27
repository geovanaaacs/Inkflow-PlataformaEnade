import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Spinner } from "@/design-system/components/Spinner";
import { toneForPercent } from "@/design-system/utils/progress-tone";
import { errorMessage } from "@/shared/api/api-error";
import { BackButton } from "@/shared/components/BackButton";
import { useAsync } from "@/shared/hooks/useAsync";
import { useReturnToState } from "@/shared/navigation/return-to";
import { getAttemptDetails } from "./api";
import { formatElapsed, optionLetter } from "./format";

/** /simulados/resultado/:attemptId — score, time spent and question-by-question review. */
export function MockExamResultPage() {
  const { attemptId = "" } = useParams();
  const returnState = useReturnToState();
  const { data, loading, error } = useAsync(() => getAttemptDetails(attemptId), [attemptId]);

  if (loading) return <Spinner label="Carregando resultado…" className="min-h-[50vh]" />;
  if (error || !data) {
    return (
      <Container as="div" className="flex flex-col gap-4">
        <BackButton fallback="/simulados" label="Voltar aos simulados" />
        <p className="text-sm text-ink-muted">
          {errorMessage(error, "Não foi possível carregar o resultado.")}
        </p>
      </Container>
    );
  }

  const { attempt, exam, questions } = data;
  if (attempt.status === "em_andamento" || !attempt.results) {
    return <Navigate to={`/simulados/${exam.id}`} replace />;
  }

  const results = attempt.results;
  const correctCount = results.filter((result) => result.correct).length;
  const unanswered = results.filter((result) => result.selectedOptionId === null).length;
  const percent = Math.round((correctCount / results.length) * 100);
  const limitMs = exam.timeLimitMinutes * 60_000;
  const elapsedMs = Math.min(
    limitMs,
    new Date(attempt.finishedAt ?? attempt.endsAt).getTime() - new Date(attempt.startedAt).getTime()
  );
  const timedOut = attempt.status === "expirado";

  return (
    <Container as="div" className="flex flex-col gap-6">
      <BackButton fallback="/simulados" label="Voltar aos simulados" />

      <Card as="section" aria-labelledby="result-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-800">Resultado do simulado</p>
            <h1 id="result-heading" className="text-2xl font-semibold text-ink-strong">
              {exam.title}
            </h1>
          </div>
          <Badge tone={timedOut ? "danger" : "success"}>
            {timedOut ? "Tempo esgotado" : "Finalizado"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-card bg-brand-300-a53 p-5 text-center">
            <p className="text-sm text-ink-muted">Acertos</p>
            <p className="text-3xl font-bold text-brand-800">
              {correctCount}/{results.length}
            </p>
          </div>
          <div className="rounded-card bg-black/[0.03] p-5 text-center">
            <p className="text-sm text-ink-muted">Aproveitamento</p>
            <p className="text-3xl font-bold text-ink-strong">{percent}%</p>
          </div>
          <div className="rounded-card bg-black/[0.03] p-5 text-center">
            <p className="text-sm text-ink-muted">Tempo utilizado</p>
            <p className="text-3xl font-bold text-ink-strong">{formatElapsed(elapsedMs)}</p>
            <p className="text-xs text-ink-muted">de {exam.timeLimitMinutes} min</p>
          </div>
        </div>

        <ProgressBar value={percent} tone={toneForPercent(percent)} label={`Aproveitamento: ${percent}%`} />

        {unanswered > 0 && (
          <p className="text-sm text-ink-muted">
            {unanswered} {unanswered === 1 ? "questão ficou" : "questões ficaram"} sem resposta.
          </p>
        )}
      </Card>

      <Card as="section" aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-lg font-semibold text-ink-strong">
          Correção questão a questão
        </h2>
        <ol className="mt-5 flex flex-col gap-3">
          {results.map((result, index) => {
            const question = questions.find((item) => item.id === result.questionId);
            const skipped = result.selectedOptionId === null;
            return (
              <li
                key={result.questionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-black/5 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  {skipped ? (
                    <MinusCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                  ) : result.correct ? (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : (
                    <XCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink-strong">
                      {index + 1}. {question?.code}{" "}
                      <span className="font-normal text-ink-muted">· {question?.topic}</span>
                    </p>
                    <p className="text-sm text-ink-muted">
                      {skipped ? "Sem resposta" : `Sua resposta: ${optionLetter(result.selectedOptionId)}`}
                      {" · "}Gabarito: {optionLetter(result.correctOptionId)}
                      <span className="sr-only">
                        {skipped ? " — não respondida" : result.correct ? " — acertou" : " — errou"}
                      </span>
                    </p>
                  </div>
                </div>
                {question && (
                  <Button
                    to={`/questoes/${question.code}`}
                    state={returnState}
                    variant="outline"
                    size="sm"
                    aria-label={`Ver questão ${question.code} com gabarito comentado`}
                  >
                    Ver questão
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button to={`/simulados/${exam.id}`}>Refazer simulado</Button>
        <Button to="/simulados" variant="outline">
          Ver outros simulados
        </Button>
      </div>
    </Container>
  );
}

export default MockExamResultPage;
