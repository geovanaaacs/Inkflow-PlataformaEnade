import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import type { QuestionOption } from "../data";

interface QuestionOptionsListProps {
  name: string;
  legend: string;
  options: QuestionOption[];
  selectedId: string | null;
  correctOptionId: string;
  submitted: boolean;
  onSelect: (id: string) => void;
}

export function QuestionOptionsList({
  name,
  legend,
  options,
  selectedId,
  correctOptionId,
  submitted,
  onSelect,
}: QuestionOptionsListProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        const isCorrectOption = option.id === correctOptionId;
        const showAsCorrect = submitted && isCorrectOption;
        const showAsWrong = submitted && isSelected && !isCorrectOption;

        return (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-input border border-transparent bg-app-surface px-4 py-3 text-sm text-ink-strong shadow-input transition-colors has-[:focus-visible]:border-brand-600",
              showAsCorrect && "border-success bg-success/10",
              showAsWrong && "border-danger bg-danger-bg",
              submitted && "cursor-default"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={isSelected}
              disabled={submitted}
              onChange={() => onSelect(option.id)}
              className="size-4 accent-brand-800"
            />
            <span className="flex-1">{option.label}</span>
            {showAsCorrect && (
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
            )}
            {showAsWrong && (
              <XCircle aria-hidden="true" className="size-4 shrink-0 text-danger" />
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
