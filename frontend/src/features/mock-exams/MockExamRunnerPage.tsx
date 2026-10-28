import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, ListChecks } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import type { Question } from "@/features/questions/data";
import { ApiError, errorMessage } from "@/shared/api/api-error";
import { BackButton } from "@/shared/components/BackButton";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { useCountdown } from "@/shared/hooks/useCountdown";
import { hasFeature } from "@/shared/plans/plan-access";
import {
  finishAttempt,
  getActiveAttempt,
  getMockExam,
  saveAttemptAnswer,
  startAttempt,
} from "./api";
import { ExamQuestion } from "./components/ExamQuestion";
import { ExamTimer } from "./components/ExamTimer";
import { FinishExamModal } from "./components/FinishExamModal";
import { QuestionNavigator } from "./components/QuestionNavigator";
import type { MockExam, MockExamAttempt } from "./data";

/** /simulados/:examId — intro screen, then the timed exam. */
export function MockExamRunnerPage() {
  const { examId = "" } = useParams();
  const { user } = useAuth();

  if (!hasFeature(user?.plan, "mockExams")) {
    return (
      <Container as="div" className="flex flex-col gap-6">
        <BackButton fallback="/simulados" />
        <Card>
          <LockedFeature
            feature="mockExams"
            label="Simulados com timer"
            description="Os simulados cronometrados fazem parte do plano Premium."
          />
        </Card>
      </Container>
    );
  }

  return <ExamLoader key={examId} examId={examId} />;
}

function loadExam(examId: string) {
  return Promise.all([getMockExam(examId), getActiveAttempt(examId)]);
}

function ExamLoader({ examId }: { examId: string }) {
  const { data, loading, error } = useAsync(() => loadExam(examId), [examId]);
  const [startedAttempt, setStartedAttempt] = useState<MockExamAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) return <Spinner label="Carregando simulado…" className="min-h-[50vh]" />;
  if (error || !data) {
    return (
      <Container as="div" className="flex flex-col gap-4">
        <BackButton fallback="/simulados" />
        <p className="text-sm text-ink-muted">
          {errorMessage(error, "Não foi possível carregar o simulado.")}
        </p>
      </Container>
    );
  }

  const [{ exam, questions }, activeAttempt] = data;
  const attempt = startedAttempt ?? activeAttempt;

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      setStartedAttempt(await startAttempt(exam.id));
    } catch (startFailure) {
      setStartError(errorMessage(startFailure));
      setStarting(false);
    }
  }

  if (!attempt) {
    return (
      <Container as="div" className="flex flex-col gap-6">
        <BackButton fallback="/simulados" label="Voltar aos simulados" />
        <Card className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-brand-800">Simulado</p>
            <h1 className="text-2xl font-semibold text-ink-strong">{exam.title}</h1>
            <p className="mt-2 text-sm text-ink-muted">{exam.description}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-strong">
            <li className="flex items-center gap-1.5">
              <ListChecks aria-hidden="true" className="size-4 text-brand-800" />
              {questions.length} questões
            </li>
            <li className="flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4 text-brand-800" />
              {exam.timeLimitMinutes} minutos
            </li>
          </ul>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>O cronômetro começa assim que você clicar em “Iniciar simulado”.</li>
            <li>Você pode navegar livremente e trocar respostas até finalizar.</li>
            <li>Quando o tempo acabar, o simulado é finalizado automaticamente.</li>
            <li>O gabarito e a correção aparecem só no resultado.</li>
          </ul>
          {startError && (
            <p role="alert" className="text-sm text-danger">
              {startError}
            </p>
          )}
          <Button onClick={handleStart} disabled={starting}>
            {starting ? "Iniciando..." : "Iniciar simulado"}
          </Button>
        </Card>
      </Container>
    );
  }

  return <ExamSession exam={exam} questions={questions} attempt={attempt} />;
}

interface ExamSessionProps {
  exam: MockExam;
  questions: Question[];
  attempt: MockExamAttempt;
}

function ExamSession({ exam, questions, attempt }: ExamSessionProps) {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>(attempt.answers);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstOpen = questions.findIndex((question) => !attempt.answers[question.id]);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finishing, setFinishing] = useState<"manual" | "timeout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finishingRef = useRef(false);
  const remaining = useCountdown(attempt.endsAt) ?? 0;

  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const currentQuestion = questions[currentIndex];

  const finish = useCallback(
    async (reason: "manual" | "timeout") => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setConfirmOpen(false);
      setFinishing(reason);
      try {
        const closed = await finishAttempt(attempt.id);
        navigate(`/simulados/resultado/${closed.id}`, { replace: true });
      } catch (finishError) {
        finishingRef.current = false;
        setFinishing(null);
        setError(errorMessage(finishError, "Não foi possível finalizar o simulado."));
      }
    },
    [attempt.id, navigate]
  );

  // Automatic finish when the countdown reaches zero.
  useEffect(() => {
    if (remaining <= 0) void finish("timeout");
  }, [remaining, finish]);

  function handleSelect(optionId: string) {
    setAnswers((current) => ({ ...current, [currentQuestion.id]: optionId }));
    saveAttemptAnswer(attempt.id, currentQuestion.id, optionId).catch((saveError: unknown) => {
      if (saveError instanceof ApiError && saveError.status === 409) void finish("timeout");
      else setError(errorMessage(saveError, "Não foi possível salvar sua resposta."));
    });
  }

  if (finishing) {
    return (
      <Container as="div" className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        {finishing === "timeout" && (
          <p className="text-lg font-semibold text-danger">Tempo esgotado!</p>
        )}
        <Spinner label="Finalizando e corrigindo o simulado…" />
      </Container>
    );
  }

  return (
    <Container as="div" className="flex flex-col gap-6">
      <Card
        bare
        className="z-20 flex flex-wrap lg:sticky lg:top-[92px] items-center justify-between gap-4 px-6 py-4 shadow-card"
      >
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink-strong">{exam.title}</h1>
          <p className="text-sm text-ink-muted">
            {answeredCount} de {questions.length} respondidas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExamTimer remainingMs={remaining} />
          <Button onClick={() => setConfirmOpen(true)}>Finalizar</Button>
        </div>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
        <Card className="p-5 sm:p-5">
          <QuestionNavigator
            total={questions.length}
            currentIndex={currentIndex}
            isAnswered={(index) => Boolean(answers[questions[index].id])}
            onNavigate={setCurrentIndex}
          />
        </Card>

        <Card className="flex flex-col gap-6">
          <ExamQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            position={currentIndex + 1}
            total={questions.length}
            selectedOptionId={answers[currentQuestion.id] ?? null}
            onSelect={handleSelect}
            disabled={remaining <= 0}
          />

          <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => index - 1)}
              leadingIcon={<ChevronLeft aria-hidden="true" className="size-4" />}
            >
              Anterior
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentIndex((index) => index + 1)}
                trailingIcon={<ChevronRight aria-hidden="true" className="size-4" />}
              >
                Próxima
              </Button>
            ) : (
              <Button size="sm" onClick={() => setConfirmOpen(true)}>
                Revisar e finalizar
              </Button>
            )}
          </div>
        </Card>
      </div>

      <FinishExamModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void finish("manual")}
        answered={answeredCount}
        total={questions.length}
      />
    </Container>
  );
}

export default MockExamRunnerPage;
