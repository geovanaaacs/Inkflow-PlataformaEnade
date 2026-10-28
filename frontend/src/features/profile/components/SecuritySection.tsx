import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { ChangePasswordModal } from "@/shared/modals/ChangePasswordModal";
import { DeleteAccountModal } from "@/shared/modals/DeleteAccountModal";

export function SecuritySection() {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <Card as="section" aria-labelledby="security-heading">
      <h2
        id="security-heading"
        className="flex items-center gap-2 text-lg font-semibold text-ink-strong"
      >
        <Lock aria-hidden="true" className="size-4 text-brand-800" />
        Segurança
      </h2>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" fullWidth onClick={() => setChangePasswordOpen(true)}>
          Alterar senha
        </Button>
        <Button variant="danger" fullWidth onClick={() => setDeleteAccountOpen(true)}>
          Apagar conta
        </Button>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
      <DeleteAccountModal
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
      />
    </Card>
  );
}
