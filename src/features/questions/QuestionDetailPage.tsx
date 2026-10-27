import { useParams } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { errorMessage } from "@/shared/api/api-error";
import { BackButton } from "@/shared/components/BackButton";
import { PlanBanner } from "@/shared/components/PlanBanner";
import { useAsync } from "@/shared/hooks/useAsync";
import { getQuestionByCode } from "./api";
import { QuestionCard } from "./components/QuestionCard";
import { usePracticeSession } from "./usePracticeSession";

/** /questoes/:code — a single question, opened from "Revisar" on the dashboard. */
export function QuestionDetailPage() {
  const { code = "" } = useParams();
  const practice = usePracticeSession();
  const { data: question, loading, error } = useAsync(() => getQuestionByCode(code), [code]);

  return (
    <Container as="div" className="flex flex-col gap-6">
      <BackButton fallback="/questoes" />

      {practice.usage && <PlanBanner planId={practice.plan} usage={practice.usage} />}

      <h1 className="sr-only">Questão {code}</h1>

      {loading && <Spinner label="Carregando questão…" className="py-10" />}

      {Boolean(error) && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-app-surface p-8 text-center text-sm text-ink-muted shadow-card">
          {errorMessage(error, "Não foi possível carregar a questão.")}
          <Button to="/questoes" size="sm" variant="outline">
            Ver todas as questões
          </Button>
        </div>
      )}

      {question && !loading && (
        <QuestionCard key={question.id} question={question} {...practice.cardProps(question.id)} />
      )}
    </Container>
  );
}

export default QuestionDetailPage;
