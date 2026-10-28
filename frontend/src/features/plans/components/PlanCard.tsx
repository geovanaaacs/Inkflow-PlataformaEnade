import { CheckCircle2, Star } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { cn } from "@/design-system/utils/cn";
import type { UserRole } from "@/features/auth/auth-context";
import { PLAN_RANK, type PlanId } from "@/shared/plans/plan-access";
import { formatPlanPrice } from "../format";
import type { Plan } from "../data";

interface PlanCardProps {
  plan: Plan;
  /** Who is looking at the page — decides the call to action. */
  viewerRole: UserRole | null;
  /** Logged-in student's current plan. */
  currentPlanId?: PlanId | null;
  onSelect?: (plan: Plan) => void;
}

export function PlanCard({ plan, viewerRole, currentPlanId, onSelect }: PlanCardProps) {
  const isCurrent = viewerRole === "aluno" && currentPlanId === plan.id;
  const isUpgrade =
    currentPlanId !== null &&
    currentPlanId !== undefined &&
    PLAN_RANK[plan.id] > PLAN_RANK[currentPlanId];

  const buttonClassName = plan.highlighted
    ? "border-transparent bg-white text-brand-800 hover:bg-white/90"
    : undefined;
  const buttonVariant = plan.highlighted ? "outline" : "soft";

  function renderAction() {
    if (viewerRole === null) {
      return (
        <Button
          to="/entrar?modo=cadastro"
          fullWidth
          variant={buttonVariant}
          className={buttonClassName}
        >
          Começar agora
        </Button>
      );
    }

    if (viewerRole !== "aluno") {
      return (
        <p className={cn("text-center text-sm", plan.highlighted ? "text-white/85" : "text-ink-muted")}>
          Planos disponíveis para alunos.
        </p>
      );
    }

    if (isCurrent) {
      return (
        <Button fullWidth variant={buttonVariant} className={buttonClassName} disabled>
          Seu plano atual
        </Button>
      );
    }

    return (
      <Button
        fullWidth
        variant={buttonVariant}
        className={buttonClassName}
        onClick={() => onSelect?.(plan)}
      >
        {isUpgrade ? "Assinar este plano" : "Mudar para este plano"}
      </Button>
    );
  }

  return (
    <div className="relative h-full">
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-badge bg-app-surface px-4 py-1 text-xs font-semibold text-brand-800 shadow-card">
          Mais popular
        </span>
      )}
      <Card
        as="article"
        aria-labelledby={`plan-${plan.id}-heading`}
        className={cn(
          "flex h-full flex-col gap-5 pt-8",
          plan.highlighted && "bg-gradient-to-br from-brand-600 to-brand-900 text-white",
          isCurrent && !plan.highlighted && "ring-2 ring-brand-600"
        )}
      >
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-badge px-4 py-1.5 text-sm font-semibold",
            plan.highlighted ? "bg-white/15 text-white" : "bg-brand-900 text-white"
          )}
        >
          {plan.highlighted && <Star aria-hidden="true" className="size-4" />}
          <span id={`plan-${plan.id}-heading`}>{plan.name}</span>
        </span>

        <p className={cn("text-2xl font-bold", plan.highlighted ? "text-white" : "text-ink-strong")}>
          {formatPlanPrice(plan)}
        </p>

        <p className={cn("text-sm", plan.highlighted ? "text-white/90" : "text-ink-muted")}>
          {plan.description}
        </p>

        <ul className="flex flex-1 flex-col gap-3">
          {plan.items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  plan.highlighted ? "text-white" : "text-success"
                )}
              />
              <span className={plan.highlighted ? "text-white" : "text-ink-strong"}>
                {item}
              </span>
            </li>
          ))}
        </ul>

        {renderAction()}
      </Card>
    </div>
  );
}
