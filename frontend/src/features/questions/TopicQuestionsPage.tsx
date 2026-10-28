import { useParams } from "react-router-dom";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { BackButton } from "@/shared/components/BackButton";
import { PlanBanner } from "@/shared/components/PlanBanner";
import { useAsync } from "@/shared/hooks/useAsync";
import { listQuestionsByArea } from "./api";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionList } from "./components/QuestionList";
import { usePracticeSession } from "./usePracticeSession";

/** /questoes/tema/:area — only the questions of the theme picked in "Praticar agora". */
export function TopicQuestionsPage() {
  const { area: areaSlug = "" } = useParams();
  const practice = usePracticeSession();
  const { data, loading, error, reload } = useAsync(
    () => listQuestionsByArea(areaSlug),
    [areaSlug]
  );

  return (
    <Container as="div" className="flex flex-col gap-6">
      <BackButton fallback="/dashboard" />

      {practice.banner && <PlanBanner {...practice.banner} />}

      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">
          {data ? data.area.name : "Praticar por tema"}
        </h1>
        {data && (
          <p className="mt-1 text-sm text-ink-muted">
            {data.questions.length}{" "}
            {data.questions.length === 1 ? "questão disponível" : "questões disponíveis"} neste
            tema
          </p>
        )}
      </div>

      {loading ? (
        <Spinner label="Carregando questões…" className="py-10" />
      ) : (
        <QuestionList
          questions={data?.questions}
          error={error}
          onRetry={reload}
          emptyMessage="Ainda não há questões cadastradas para este tema."
          renderQuestion={(question) => (
            <QuestionCard question={question} {...practice.cardProps(question.id)} />
          )}
        />
      )}
    </Container>
  );
}

export default TopicQuestionsPage;
