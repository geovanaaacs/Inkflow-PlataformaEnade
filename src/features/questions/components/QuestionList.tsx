import type { ReactNode } from "react";
import { Button } from "@/design-system/components/Button";
import { errorMessage } from "@/shared/api/api-error";
import type { Question } from "../data";

interface QuestionListProps {
  questions: Question[] | undefined;
  error: unknown;
  onRetry: () => void;
  emptyMessage: string;
  renderQuestion: (question: Question) => ReactNode;
}

/** Shared list/empty/error states for the pages that show several questions. */
export function QuestionList({
  questions,
  error,
  onRetry,
  emptyMessage,
  renderQuestion,
}: QuestionListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-app-surface p-8 text-center text-sm text-ink-muted shadow-card">
        {errorMessage(error, "Não foi possível carregar as questões.")}
        <Button size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <p className="rounded-card bg-app-surface p-8 text-center text-sm text-ink-muted shadow-card">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {questions.map((question) => (
        <li key={question.id}>{renderQuestion(question)}</li>
      ))}
    </ul>
  );
}
