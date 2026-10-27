import { Lock } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { requiredPlanFor, type FeatureKey } from "@/shared/plans/plan-access";
import { UpsellBar } from "./UpsellBar";

interface LockedFeatureProps {
  feature: FeatureKey;
  /** Short name of the feature, shown in the upsell bar. */
  label: string;
  description: string;
  className?: string;
}

/**
 * Placeholder shown instead of a feature the user's plan doesn't include:
 * explains what the feature does and invites to upgrade (never hides it).
 */
export function LockedFeature({ feature, label, description, className }: LockedFeatureProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-800" />
        {description}
      </p>
      <UpsellBar label={label} requiredPlan={requiredPlanFor(feature)} />
    </div>
  );
}
