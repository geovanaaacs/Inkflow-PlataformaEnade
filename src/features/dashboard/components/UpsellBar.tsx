import { Link } from "react-router-dom";
import { Badge } from "@/design-system/components/Badge";

interface UpsellBarProps {
  label: string;
}

/** Locked-feature teaser (Simulados, Ranking, Professores) linking to Planos. */
export function UpsellBar({ label }: UpsellBarProps) {
  return (
    <Link
      to="/planos"
      className="flex items-center justify-between gap-4 rounded-card bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-4 text-white transition-opacity hover:opacity-95"
    >
      <span className="flex items-center gap-3 text-sm font-semibold">
        {label}
        <Badge tone="warning" className="bg-white/20 text-white">
          Pro
        </Badge>
      </span>
      <span className="text-sm font-semibold underline-offset-2">
        Faça upgrade para ilimitado →
      </span>
    </Link>
  );
}
