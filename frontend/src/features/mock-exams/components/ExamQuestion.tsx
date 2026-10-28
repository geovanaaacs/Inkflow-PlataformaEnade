import { cn } from "@/design-system/utils/cn";
import type { Question } from "@/features/questions/data";

interface ExamQuestionProps {
  question: Question;
  position: number;
  total: number;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled: boolean;
}

/** One exam question without feedback — the answer key only shows in the result. */
export function ExamQuestion({
  question,
  position,
  total,
  selectedOptionId,
  onSelect,
  disabled,
}: ExamQuestionProps) {
  const headingId = `exam-question-${question.id}`;

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-brand-800">
          Questão {position} de {total}
        </p>
        <h2 id={headingId} className="mt-1 text-sm font-semibold text-ink-strong">
          [{question.code}] {question.area.name} › {question.topic}
        </h2>
      </header>

      <p className="whitespace-pre-line text-sm text-ink-strong">{question.statement}</p>

      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="sr-only">Alternativas da questão {position}</legend>
        {question.options.map((option) => {
          const selected = option.id === selectedOptionId;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-input border bg-app-surface px-4 py-3 text-sm text-ink-strong shadow-input transition-colors has-[:focus-visible]:border-brand-600",
                selected ? "border-brand-600 bg-brand-500-a24/40" : "border-transparent"
              )}
            >
              <input
                type="radio"
                name={`exam-${question.id}`}
                value={option.id}
                checked={selected}
                onChange={() => onSelect(option.id)}
                className="size-4 accent-brand-800"
              />
              <span className="w-5 font-semibold text-brand-800">{option.id.toUpperCase()})</span>
              <span className="flex-1">{option.label}</span>
            </label>
          );
        })}
      </fieldset>
    </article>
  );
}
