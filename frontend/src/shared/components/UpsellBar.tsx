import { Link } from "react-router-dom";
import { Badge } from "@/design-system/components/Badge";
import { useReturnToState } from "@/shared/navigation/return-to";
import { PLAN_LABEL, type PlanId } from "@/shared/plans/plan-access";

interface UpsellBarProps {
  label: string;
  /** Plan that unlocks the feature — shown in the badge and the call to action. */
  requiredPlan: PlanId;
}

/** Locked-feature teaser (Simulados, Ranking, Mentoria...) linking to Planos. */
export function UpsellBar({ label, requiredPlan }: UpsellBarProps) {
  const returnState = useReturnToState();
  const planLabel = PLAN_LABEL[requiredPlan];

  return (
    <Link
      to="/planos"
      state={returnState}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-4 text-white transition-opacity hover:opacity-95"
    >
      <span className="flex items-center gap-3 text-sm font-semibold">
        {label}
        <Badge tone="warning" className="bg-white/20 text-white">
          {planLabel}
        </Badge>
      </span>
      <span className="text-sm font-semibold underline-offset-2">
        Faça upgrade para o {planLabel} →
      </span>
    </Link>
  );
}
