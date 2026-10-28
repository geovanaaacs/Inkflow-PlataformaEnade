import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Textarea } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { Spinner } from "@/design-system/components/Spinner";
import { errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { formatDateTime } from "@/shared/utils/dates";
import { addNote, listQuestionNotes } from "../api";
import type { NoteRecord } from "../data";

interface QuestionNotesModalProps {
  open: boolean;
  onClose: () => void;
  questionId: string;
  questionCode: string;
  /** Whether the student's plan includes the notes block (Avançado+). */
  unlocked: boolean;
  onNoteAdded: () => void;
}

/** Notes on one question: earlier notes (newest first) plus a form for a new one. */
export function QuestionNotesModal({
  open,
  onClose,
  questionId,
  questionCode,
  unlocked,
  onNoteAdded,
}: QuestionNotesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Anotações · ${questionCode}`}
      size="lg"
    >
      {unlocked ? (
        <NotesEditor
          questionId={questionId}
          questionCode={questionCode}
          onClose={onClose}
          onNoteAdded={onNoteAdded}
        />
      ) : (
        <LockedFeature
          feature="notes"
          label="Bloco de anotações"
          description="Faça quantas anotações quiser em cada questão e revise tudo depois em “Minhas anotações”."
        />
      )}
    </Modal>
  );
}

interface NotesEditorProps {
  questionId: string;
  questionCode: string;
  onClose: () => void;
  onNoteAdded: () => void;
}

function NotesEditor({ questionId, questionCode, onClose, onNoteAdded }: NotesEditorProps) {
  const { data: loadedNotes, loading, error } = useAsync(
    () => listQuestionNotes(questionId),
    [questionId]
  );
  const [addedNotes, setAddedNotes] = useState<NoteRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const notes = [...addedNotes, ...(loadedNotes ?? [])];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    if (!draft.trim()) {
      setFormError("Escreva sua anotação antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const note = await addNote(questionId, draft);
      setAddedNotes((current) => [note, ...current]);
      setDraft("");
      setSavedMessage("Anotação salva.");
      onNoteAdded();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Anotações anteriores">
        {loading ? (
          <Spinner label="Carregando anotações…" className="py-4" />
        ) : error ? (
          <p className="text-sm text-ink-muted">
            {errorMessage(error, "Não foi possível carregar suas anotações.")}
          </p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Você ainda não tem anotações nesta questão.
          </p>
        ) : (
          <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
            {notes.map((note) => (
              <li key={note.id} className="rounded-input bg-black/[0.03] px-3 py-2">
                <p className="whitespace-pre-line text-sm text-ink-strong">{note.content}</p>
                <p className="mt-1 text-xs text-ink-muted">{formatDateTime(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-black/5 pt-5">
        <Textarea
          label={`Nova anotação para a questão ${questionCode}`}
          placeholder="Escreva aqui sua anotação, dúvida ou resumo sobre essa questão..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={2000}
          error={formError ?? undefined}
        />
        <p role="status" aria-live="polite" className="-mt-2 text-sm text-success">
          {savedMessage}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Fechar
          </Button>
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? "Salvando..." : "Salvar anotação"}
          </Button>
        </div>
      </form>
    </div>
  );
}
