import { NotebookPen } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import type { PanelKey } from "./types";

interface QuestionActionsBarProps {
  questionId: string;
  onAnswer: () => void;
  answerDisabled: boolean;
  submitted: boolean;
  activePanel: PanelKey | null;
  onTogglePanel: (panel: PanelKey) => void;
  hasNote: boolean;
  onOpenNote: () => void;
}

const panelButtons: { key: PanelKey; label: string }[] = [
  { key: "ai", label: "Gabarito IA" },
  { key: "community", label: "Comunidade" },
  { key: "teacher", label: "Professor" },
];

export function QuestionActionsBar({
  questionId,
  onAnswer,
  answerDisabled,
  submitted,
  activePanel,
  onTogglePanel,
  hasNote,
  onOpenNote,
}: QuestionActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" onClick={onAnswer} disabled={answerDisabled}>
        {submitted ? "Respondido" : "Responder"}
      </Button>

      {panelButtons.map((panel) => {
        const isActive = activePanel === panel.key;
        return (
          <Button
            key={panel.key}
            size="sm"
            variant={isActive ? "soft" : "outline"}
            aria-expanded={isActive}
            aria-controls={`${panel.key}-panel-${questionId}`}
            onClick={() => onTogglePanel(panel.key)}
          >
            {panel.label}
          </Button>
        );
      })}

      <Button
        size="sm"
        variant={hasNote ? "soft" : "outline"}
        leadingIcon={<NotebookPen aria-hidden="true" className="size-4" />}
        onClick={onOpenNote}
      >
        Anotação
      </Button>
    </div>
  );
}
