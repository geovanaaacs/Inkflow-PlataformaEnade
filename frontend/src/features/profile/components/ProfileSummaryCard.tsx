import { User } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";

interface ProfileSummaryCardProps {
  name: string;
  description: string;
}

export function ProfileSummaryCard({ name, description }: ProfileSummaryCardProps) {
  return (
    <Card as="section" aria-label="Resumo do perfil">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-[50px] shrink-0 items-center justify-center rounded-badge bg-brand-500-a24 text-brand-800"
          >
            <User className="size-6" />
          </span>
          <div>
            <p className="text-base font-semibold text-ink-strong">{name}</p>
            <p className="text-sm text-ink-muted">{description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          Editar foto
        </Button>
      </div>
    </Card>
  );
}
