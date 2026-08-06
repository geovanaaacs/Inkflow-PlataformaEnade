import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { Textarea } from "@/design-system/components/Input";

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  questionCode: string;
  initialValue: string;
  onSave: (note: string) => void;
}

export function NoteModal({
  open,
  onClose,
  questionCode,
  initialValue,
  onSave,
}: NoteModalProps) {
  const [note, setNote] = useState(initialValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(note);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova anotação">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Textarea
          label={`Anotação para a questão ${questionCode}`}
          placeholder="Escreva aqui sua anotação, dúvida ou resumo sobre essa questão..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" fullWidth>
            Salvar anotação
          </Button>
        </div>
      </form>
    </Modal>
  );
}
