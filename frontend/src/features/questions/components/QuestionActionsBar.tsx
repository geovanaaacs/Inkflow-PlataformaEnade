import { Lock, NotebookPen } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import type { PanelKey } from "./types";

interface QuestionActionsBarProps {
  questionId: string;
  onAnswer: () => void;
  answerDisabled: boolean;
  submitting: boolean;
  submitted: boolean;
  activePanel: PanelKey | null;
  onTogglePanel: (panel: PanelKey) => void;
  noteCount: number;
  notesLocked: boolean;
  onOpenNote: () => void;
}

/**
 * `revealsAnswer`: the panel gives the answer away (the AI explanation states
 * the correct option, the teacher's comment explains it), so it only opens
 * after the question is answered.
 */
const panelButtons: { key: PanelKey; label: string; revealsAnswer: boolean }[] = [
  { key: "ai", label: "Gabarito IA", revealsAnswer: true },
  { key: "community", label: "Comunidade", revealsAnswer: false },
  { key: "teacher", label: "Professor", revealsAnswer: true },
];

export function QuestionActionsBar({
  questionId,
  onAnswer,
  answerDisabled,
  submitting,
  submitted,
  activePanel,
  onTogglePanel,
  noteCount,
  notesLocked,
  onOpenNote,
}: QuestionActionsBarProps) {
  const noteLabel = noteCount > 0 ? `Anotação (${noteCount})` : "Anotação";

  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" onClick={onAnswer} disabled={answerDisabled}>
        {submitting ? "Respondendo..." : submitted ? "Respondido" : "Responder"}
      </Button>

      {panelButtons.map((panel) => {
        const isActive = activePanel === panel.key;
        const lockedUntilAnswered = panel.revealsAnswer && !submitted;
        return (
          <Button
            key={panel.key}
            size="sm"
            variant={isActive ? "soft" : "outline"}
            aria-expanded={isActive}
            aria-controls={`${panel.key}-panel-${questionId}`}
            disabled={lockedUntilAnswered}
            title={lockedUntilAnswered ? "Responda a questão para liberar" : undefined}
            aria-label={lockedUntilAnswered ? `${panel.label} (responda a questão para liberar)` : undefined}
            trailingIcon={
              lockedUntilAnswered ? <Lock aria-hidden="true" className="size-3.5 opacity-70" /> : undefined
            }
            onClick={() => onTogglePanel(panel.key)}
          >
            {panel.label}
          </Button>
        );
      })}

      <Button
        size="sm"
        variant={noteCount > 0 ? "soft" : "outline"}
        leadingIcon={<NotebookPen aria-hidden="true" className="size-4" />}
        trailingIcon={
          notesLocked ? <Lock aria-hidden="true" className="size-3.5 opacity-70" /> : undefined
        }
        aria-label={
          notesLocked
            ? "Anotação (requer plano Avançado)"
            : noteCount > 0
              ? `Anotações: ${noteCount} nesta questão`
              : undefined
        }
        onClick={onOpenNote}
      >
        {noteLabel}
      </Button>
    </div>
  );
}
