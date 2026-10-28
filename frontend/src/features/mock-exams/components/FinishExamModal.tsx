import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";

interface FinishExamModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  answered: number;
  total: number;
}

export function FinishExamModal({ open, onClose, onConfirm, answered, total }: FinishExamModalProps) {
  const unanswered = total - answered;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finalizar simulado?"
      description={
        unanswered > 0
          ? `Você respondeu ${answered} de ${total} questões. As ${unanswered} sem resposta contam como erro.`
          : `Você respondeu todas as ${total} questões. Depois de finalizar não é possível alterar as respostas.`
      }
    >
      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Continuar respondendo
        </Button>
        <Button fullWidth onClick={onConfirm}>
          Finalizar
        </Button>
      </div>
    </Modal>
  );
}
