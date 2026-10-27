import { NotebookPen } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { Spinner } from "@/design-system/components/Spinner";
import { listMyNotes, type NoteWithQuestion } from "@/features/questions/api";
import { errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { useReturnToState } from "@/shared/navigation/return-to";
import { formatDateTime } from "@/shared/utils/dates";

interface MyNotesModalProps {
  open: boolean;
  onClose: () => void;
  /** Whether the user's plan includes the notes block (Avançado+). */
  unlocked: boolean;
}

/** "Minhas anotações": every note of the student, grouped by question. */
export function MyNotesModal({ open, onClose, unlocked }: MyNotesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Minhas anotações"
      description={
        unlocked ? "Todas as anotações que você fez nas questões, das mais recentes às mais antigas." : undefined
      }
      className="max-w-2xl"
    >
      {unlocked ? (
        <NotesList onNavigate={onClose} />
      ) : (
        <LockedFeature
          feature="notes"
          label="Bloco de anotações"
          description="Organize seus estudos com anotações individuais em cada questão e revise tudo em um só lugar."
        />
      )}
    </Modal>
  );
}

function groupByQuestion(notes: NoteWithQuestion[]) {
  const groups = new Map<string, NoteWithQuestion[]>();
  for (const note of notes) {
    groups.set(note.questionCode, [...(groups.get(note.questionCode) ?? []), note]);
  }
  return Array.from(groups.values());
}

function NotesList({ onNavigate }: { onNavigate: () => void }) {
  const returnState = useReturnToState();
  const { data: notes, loading, error } = useAsync(listMyNotes, []);

  if (loading) return <Spinner label="Carregando anotações…" className="py-6" />;
  if (error) {
    return (
      <p className="text-sm text-ink-muted">
        {errorMessage(error, "Não foi possível carregar suas anotações.")}
      </p>
    );
  }
  if (!notes || notes.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <NotebookPen aria-hidden="true" className="size-4" />
        Você ainda não fez anotações. Use o botão "Anotação" em qualquer questão.
      </p>
    );
  }

  return (
    <ul className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
      {groupByQuestion(notes).map((group) => {
        const first = group[0];
        return (
          <li key={first.questionCode} className="rounded-input border border-black/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-strong">
                <span className="text-brand-800">[{first.questionCode}]</span> {first.topic}
                <span className="font-normal text-ink-muted"> · {first.areaName}</span>
              </p>
              <Button
                to={`/questoes/${first.questionCode}`}
                state={returnState}
                variant="outline"
                size="sm"
                onClick={onNavigate}
                aria-label={`Ver questão ${first.questionCode}`}
              >
                Ver questão
              </Button>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {group.map((note) => (
                <li key={note.id} className="rounded-input bg-black/[0.02] px-3 py-2">
                  <p className="whitespace-pre-line text-sm text-ink-strong">{note.content}</p>
                  <p className="mt-1 text-xs text-ink-muted">{formatDateTime(note.createdAt)}</p>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
