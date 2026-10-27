import { useMemo, useState } from "react";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { PlanBanner } from "@/shared/components/PlanBanner";
import { useAsync } from "@/shared/hooks/useAsync";
import {
  ALL_VALUE,
  getQuestionFilterOptions,
  listQuestions,
  type QuestionFilters as QuestionFiltersValue,
} from "./api";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionFilters } from "./components/QuestionFilters";
import { QuestionList } from "./components/QuestionList";
import { usePracticeSession } from "./usePracticeSession";

const EMPTY_FILTERS: QuestionFiltersValue = {
  keyword: "",
  area: ALL_VALUE,
  year: ALL_VALUE,
  type: ALL_VALUE,
};

export function QuestionsPage() {
  const practice = usePracticeSession();
  const [draftKeyword, setDraftKeyword] = useState("");
  const [filters, setFilters] = useState<QuestionFiltersValue>(EMPTY_FILTERS);

  const { data: filterOptions } = useAsync(getQuestionFilterOptions, []);
  const { data: questions, loading, error, reload } = useAsync(
    () => listQuestions(filters),
    [filters]
  );

  const areaOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: "Sua área de TI" },
      ...(filterOptions?.areas ?? []).map((area) => ({ value: area.slug, label: area.name })),
    ],
    [filterOptions]
  );
  const yearOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: "Ano" },
      ...(filterOptions?.years ?? []).map((year) => ({ value: String(year), label: String(year) })),
    ],
    [filterOptions]
  );
  const typeOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: "Tipo" },
      ...(filterOptions?.types ?? []).map((type) => ({ value: type, label: type })),
    ],
    [filterOptions]
  );

  function handleClear() {
    setDraftKeyword("");
    setFilters(EMPTY_FILTERS);
  }

  return (
    <Container as="div" className="flex flex-col gap-6">
      <h1 className="sr-only">Questões</h1>

      {practice.usage && <PlanBanner planId={practice.plan} usage={practice.usage} />}

      <QuestionFilters
        draftKeyword={draftKeyword}
        onDraftKeywordChange={setDraftKeyword}
        value={filters}
        onChange={setFilters}
        onSubmit={() => setFilters((current) => ({ ...current, keyword: draftKeyword }))}
        onClear={handleClear}
        areaOptions={areaOptions}
        yearOptions={yearOptions}
        typeOptions={typeOptions}
      />

      {loading && !questions ? (
        <Spinner label="Carregando questões…" className="py-10" />
      ) : (
        <QuestionList
          questions={questions}
          error={error}
          onRetry={reload}
          emptyMessage="Nenhuma questão encontrada para os filtros selecionados."
          renderQuestion={(question) => (
            <QuestionCard question={question} {...practice.cardProps(question.id)} />
          )}
        />
      )}
    </Container>
  );
}

export default QuestionsPage;
