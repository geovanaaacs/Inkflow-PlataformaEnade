import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/design-system/components/Card";
import { cn } from "@/design-system/utils/cn";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError, errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { hasFeature } from "@/shared/plans/plan-access";
import { answerQuestion, type AnswerResult } from "../api";
import type { CommunityComment, Question } from "../data";
import { QuestionActionsBar } from "./QuestionActionsBar";
import { QuestionNotesModal } from "./QuestionNotesModal";
import { QuestionOptionsList } from "./QuestionOptionsList";
import type { PanelKey } from "./types";
import { AiExplanationPanel } from "./panels/AiExplanationPanel";
import { CommunityPanel } from "./panels/CommunityPanel";
import { TeacherPanel } from "./panels/TeacherPanel";

interface QuestionCardProps {
  question: Question;
  /** How many notes the student already has on this question. */
  noteCount?: number;
  onAnswered?: (result: AnswerResult) => void;
  onNoteAdded?: (questionId: string) => void;
}

export function QuestionCard({
  question,
  noteCount = 0,
  onAnswered,
  onNoteAdded,
}: QuestionCardProps) {
  const { user } = useAuth();
  const notesUnlocked = hasFeature(user?.plan, "notes");

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>(question.community);

  const submitted = result !== null;
  const headingId = `question-heading-${question.id}`;

  function togglePanel(panel: PanelKey) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function handleAddComment(comment: string) {
    setComments((current) => [...current, { author: "Você", comment }]);
  }

  async function handleAnswer() {
    if (!selectedOptionId) return;
    setSubmitting(true);
    setAnswerError(null);
    setLimitReached(false);
    try {
      const answer = await answerQuestion(question.id, selectedOptionId);
      setResult(answer);
      onAnswered?.(answer);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) setLimitReached(true);
      else setAnswerError(errorMessage(error, "Não foi possível registrar sua resposta."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="article" aria-labelledby={headingId} bare className="overflow-hidden shadow-card">
      <header className="bg-brand-300-a53/60 px-6 py-4">
        <h2 id={headingId} className="text-sm font-semibold text-ink-strong">
          <span className="text-brand-800">[{question.code}]</span>{" "}
          {question.area.name} › {question.topic}
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
          correctOptionId={result?.correctOptionId ?? question.correctOptionId}
          submitted={submitted}
          onSelect={setSelectedOptionId}
        />

        {result && (
          <p
            role="status"
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-badge px-3 py-1.5 text-sm font-semibold",
              result.correct ? "bg-success/15 text-success" : "bg-danger-bg text-danger"
            )}
          >
            {result.correct ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : (
              <XCircle aria-hidden="true" className="size-4" />
            )}
            {result.correct ? "Resposta correta!" : "Resposta errada"}
            {result.attemptNumber > 1 && (
              <span className="font-normal">
                · {result.attemptNumber}ª tentativa (não conta no limite diário)
              </span>
            )}
          </p>
        )}

        {answerError && (
          <p role="alert" className="text-sm text-danger">
            {answerError}
          </p>
        )}

        {limitReached && (
          <div role="alert">
            <LockedFeature
              feature="unlimitedQuestions"
              label="Questões ilimitadas"
              description="Você atingiu o limite de questões de hoje do plano Básico. Questões que você já respondeu antes podem ser refeitas sem gastar o limite. Volte amanhã ou faça upgrade para continuar agora."
            />
          </div>
        )}

        <QuestionActionsBar
          questionId={question.id}
          onAnswer={handleAnswer}
          answerDisabled={!selectedOptionId || submitted || submitting}
          submitting={submitting}
          submitted={submitted}
          activePanel={activePanel}
          onTogglePanel={togglePanel}
          noteCount={noteCount}
          notesLocked={!notesUnlocked}
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

      <QuestionNotesModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        questionId={question.id}
        questionCode={question.code}
        unlocked={notesUnlocked}
        onNoteAdded={() => onNoteAdded?.(question.id)}
      />
    </Card>
  );
}
