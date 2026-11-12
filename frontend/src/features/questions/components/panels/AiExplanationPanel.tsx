import { Fragment } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import type { Question } from "../../data";

interface AiExplanationPanelProps {
  id: string;
  question: Question;
}

/** Section titles of the AI explanation format (backend/src/modules/ai), shown in bold. */
const SECTION_TITLE =
  /^(Gabarito: Alternativa [A-E]|Por que essa é a resposta\?|Onde está o erro das outras opções\?|Para lembrar na hora da prova:)$/;

export function AiExplanationPanel({ id, question }: AiExplanationPanelProps) {
  const correctIndex = question.options.findIndex(
    (option) => option.id === question.correctOptionId
  );
  const correctLetter = String.fromCharCode(65 + Math.max(correctIndex, 0));

  return (
    <div id={id} className="rounded-card bg-brand-300-a53 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink-strong">
          <Sparkles aria-hidden="true" className="size-4 text-brand-ink" />
          Gabarito Comentado por IA
        </h3>
        <Badge tone="brand">Resposta: {correctLetter}</Badge>
      </div>
      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-strong">
        {question.aiExplanation
          ? question.aiExplanation.split("\n").map((line, index) => (
              <Fragment key={index}>
                {index > 0 && "\n"}
                {SECTION_TITLE.test(line.trim()) ? <strong className="font-semibold text-brand-ink">{line}</strong> : line}
              </Fragment>
            ))
          : "A explicação da IA para esta questão ainda está sendo preparada."}
      </p>
    </div>
  );
}
