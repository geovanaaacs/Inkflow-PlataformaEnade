import { Sparkles } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import type { Question } from "../../data";

interface AiExplanationPanelProps {
  id: string;
  question: Question;
}

export function AiExplanationPanel({ id, question }: AiExplanationPanelProps) {
  const correctIndex = question.options.findIndex(
    (option) => option.id === question.correctOptionId
  );
  const correctLetter = String.fromCharCode(65 + Math.max(correctIndex, 0));

  return (
    <div id={id} className="rounded-card bg-brand-300-a53 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink-strong">
          <Sparkles aria-hidden="true" className="size-4 text-brand-800" />
          Gabarito Comentado por IA
        </h3>
        <Badge tone="brand">Resposta: {correctLetter}</Badge>
      </div>
      <p className="mt-4 whitespace-pre-line text-sm text-ink-strong">
        {question.aiExplanation}
      </p>
    </div>
  );
}
