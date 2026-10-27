import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Textarea } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { errorMessage } from "@/shared/api/api-error";
import { requestSlot, type OpenSlot } from "../api";
import { SESSION_TYPE_LABEL } from "../data";
import { formatSlotDate, formatSlotTime } from "../format";

interface RequestSlotModalProps {
  slot: OpenSlot | null;
  onClose: () => void;
  onRequested: () => void;
}

export function RequestSlotModal({ slot, onClose, onRequested }: RequestSlotModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setMessage("");
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestSlot(slot.id, message);
      setMessage("");
      onRequested();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={slot !== null}
      onClose={handleClose}
      title={slot ? `Solicitar vaga · ${SESSION_TYPE_LABEL[slot.type]}` : "Solicitar vaga"}
      description={
        slot
          ? `${slot.topic} — ${formatSlotDate(slot.startsAt)}, ${formatSlotTime(slot.startsAt, slot.durationMinutes)}, com ${slot.teacherName}.`
          : undefined
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Textarea
          label="Mensagem para o professor (opcional)"
          placeholder="Conte o que você gostaria de revisar nesse encontro..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={500}
          hint="O professor confirma ou recusa a solicitação. Você acompanha o status em “Minhas solicitações”."
          error={error ?? undefined}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
