import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

/** Confirmation shown after requesting a password reset link. */
export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar senha"
      description="Enviamos um link de alteração de senha em seu e-mail. Verifique sua caixa de mensagens."
    >
      <Button onClick={onClose} fullWidth>
        Entendi
      </Button>
    </Modal>
  );
}
