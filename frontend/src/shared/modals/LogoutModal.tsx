import { useNavigate } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { useAuth } from "@/features/auth/auth-context";

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function LogoutModal({ open, onClose }: LogoutModalProps) {
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
      title="Sair do Inkflow"
      description="Vamos desconectá-lo e remover todos os dados offline, incluindo anotações não salvas e respostas não enviadas."
    >
      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" fullWidth onClick={handleConfirm}>
          Sair
        </Button>
      </div>
    </Modal>
  );
}
