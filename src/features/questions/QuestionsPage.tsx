import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Container } from "@/design-system/components/Container";
import { QuestionCard } from "./components/QuestionCard";
import {
  ALL_VALUE,
  QuestionFilters,
  type QuestionFiltersValue,
} from "./components/QuestionFilters";
import { questions } from "./data";

function uniqueOptions(values: string[], allLabel: string) {
  const unique = Array.from(new Set(values)).sort();
  return [
    { value: ALL_VALUE, label: allLabel },
    ...unique.map((value) => ({ value, label: value })),
  ];
}

export function QuestionsPage() {
  const [searchParams] = useSearchParams();
  const highlightedCode = searchParams.get("revisar");

  const [draftKeyword, setDraftKeyword] = useState("");
  const [filters, setFilters] = useState<QuestionFiltersValue>({
    keyword: "",
    area: ALL_VALUE,
    year: ALL_VALUE,
    type: ALL_VALUE,
  });

  const areaOptions = useMemo(
    () => uniqueOptions(questions.map((q) => q.subject), "Sua área de TI"),
    []
  );
  const yearOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: "Ano" },
      ...Array.from(new Set(questions.map((q) => q.year)))
        .sort((a, b) => b - a)
        .map((year) => ({ value: String(year), label: String(year) })),
    ],
    []
  );
  const typeOptions = useMemo(
    () => uniqueOptions(questions.map((q) => q.type), "Tipo"),
    []
  );

  const filteredQuestions = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesKeyword =
        keyword.length === 0 ||
        question.code.toLowerCase().includes(keyword) ||
        question.topic.toLowerCase().includes(keyword) ||
        question.subject.toLowerCase().includes(keyword) ||
        question.statement.toLowerCase().includes(keyword);
      const matchesArea = filters.area === ALL_VALUE || question.subject === filters.area;
      const matchesYear =
        filters.year === ALL_VALUE || String(question.year) === filters.year;
      const matchesType = filters.type === ALL_VALUE || question.type === filters.type;

      return matchesKeyword && matchesArea && matchesYear && matchesType;
    });
  }, [filters]);

  function handleClear() {
    setDraftKeyword("");
    setFilters({ keyword: "", area: ALL_VALUE, year: ALL_VALUE, type: ALL_VALUE });
  }

  return (
    <Container as="div" className="flex flex-col gap-6">
      <h1 className="sr-only">Questões</h1>

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

      {filteredQuestions.length === 0 ? (
        <p className="rounded-card bg-app-surface p-8 text-center text-sm text-ink-muted shadow-card">
          Nenhuma questão encontrada para os filtros selecionados.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {filteredQuestions.map((question) => (
            <li key={question.id}>
              <QuestionCard
                question={question}
                highlighted={question.code === highlightedCode}
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export default QuestionsPage;
