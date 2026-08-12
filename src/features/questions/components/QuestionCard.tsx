import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/design-system/components/Card";
import { cn } from "@/design-system/utils/cn";
import type { CommunityComment, Question } from "../data";
import { NoteModal } from "./NoteModal";
import { QuestionActionsBar } from "./QuestionActionsBar";
import { QuestionOptionsList } from "./QuestionOptionsList";
import type { PanelKey } from "./types";
import { AiExplanationPanel } from "./panels/AiExplanationPanel";
import { CommunityPanel } from "./panels/CommunityPanel";
import { TeacherPanel } from "./panels/TeacherPanel";

interface QuestionCardProps {
  question: Question;
  highlighted?: boolean;
}

export function QuestionCard({ question, highlighted = false }: QuestionCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [comments, setComments] = useState<CommunityComment[]>(question.community);

  const isCorrect = submitted && selectedOptionId === question.correctOptionId;
  const headingId = `question-heading-${question.id}`;

  function togglePanel(panel: PanelKey) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function handleAddComment(comment: string) {
    setComments((current) => [
      ...current,
      { author: "Você", comment },
    ]);
  }

  return (
    <Card
      as="article"
      aria-labelledby={headingId}
      bare
      className={cn(
        "overflow-hidden shadow-card",
        highlighted && "ring-2 ring-brand-600"
      )}
    >
      <header className="bg-brand-300-a53/60 px-6 py-4">
        <h2 id={headingId} className="text-sm font-semibold text-ink-strong">
          <span className="text-brand-800">[{question.code}]</span>{" "}
          {question.subject} › {question.topic}
        </h2>
      </header>

      <div className="flex flex-col gap-5 p-6">
        <p className="whitespace-pre-line text-sm text-ink-strong">
          {question.statement}
        </p>

        <QuestionOptionsList
          name={`question-${question.id}`}
          legend={`Alternativas da questão ${question.code}`}
          options={question.options}
          selectedId={selectedOptionId}
          correctOptionId={question.correctOptionId}
          submitted={submitted}
          onSelect={setSelectedOptionId}
        />

        {submitted && (
          <p
            role="status"
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-badge px-3 py-1.5 text-sm font-semibold",
              isCorrect ? "bg-success/15 text-success" : "bg-danger-bg text-danger"
            )}
          >
            {isCorrect ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : (
              <XCircle aria-hidden="true" className="size-4" />
            )}
            {isCorrect ? "Resposta correta!" : "Resposta errada"}
          </p>
        )}

        <QuestionActionsBar
          questionId={question.id}
          onAnswer={() => setSubmitted(true)}
          answerDisabled={!selectedOptionId || submitted}
          submitted={submitted}
          activePanel={activePanel}
          onTogglePanel={togglePanel}
          hasNote={note.trim().length > 0}
          onOpenNote={() => setNoteOpen(true)}
        />

        {activePanel === "ai" && (
          <AiExplanationPanel id={`ai-panel-${question.id}`} question={question} />
        )}
        {activePanel === "community" && (
          <CommunityPanel
            id={`community-panel-${question.id}`}
            comments={comments}
            onAddComment={handleAddComment}
          />
        )}
        {activePanel === "teacher" && (
          <TeacherPanel id={`teacher-panel-${question.id}`} teacher={question.teacher} />
        )}
      </div>

      <NoteModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        questionCode={question.code}
        initialValue={note}
        onSave={setNote}
      />
    </Card>
  );
}
