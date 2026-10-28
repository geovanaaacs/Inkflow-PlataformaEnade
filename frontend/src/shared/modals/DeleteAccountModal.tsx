import { useNavigate } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { useAuth } from "@/features/auth/auth-context";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleConfirm() {
    logout();
    onClose();
    navigate("/", { replace: true });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apagar conta"
      description="Você está prestes a apagar sua conta permanentemente. Ao fazer isso você perderá todos seus dados salvos."
    >
      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" fullWidth onClick={handleConfirm}>
          Apagar conta
        </Button>
      </div>
    </Modal>
  );
}
