import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { errorMessage } from "@/shared/api/api-error";
import { formatPlanPrice } from "../format";
import type { Plan } from "../data";

interface ConfirmPlanModalProps {
  plan: Plan | null;
  onClose: () => void;
  onConfirm: (plan: Plan) => Promise<void>;
}

/** Confirmation for the simulated plan change (no payment is processed). */
export function ConfirmPlanModal({ plan, onClose, onConfirm }: ConfirmPlanModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(plan);
    } catch (confirmError) {
      setError(errorMessage(confirmError));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={plan !== null}
      onClose={handleClose}
      title={plan ? `Mudar para o plano ${plan.name}` : "Mudar de plano"}
      description={
        plan
          ? `Valor: ${formatPlanPrice(plan)}. Esta é uma simulação — nenhuma cobrança será feita.`
          : undefined
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button fullWidth onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Confirmando..." : "Confirmar"}
        </Button>
      </div>
    </Modal>
  );
}
