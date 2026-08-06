import { CheckCircle2, Star } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { cn } from "@/design-system/utils/cn";
import type { Plan } from "../data";

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
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
          plan.highlighted && "bg-gradient-to-br from-brand-600 to-brand-900 text-white"
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

        <Button
          to="/entrar?modo=cadastro"
          fullWidth
          variant={plan.highlighted ? "outline" : "soft"}
          className={
            plan.highlighted
              ? "border-transparent bg-white text-brand-800 hover:bg-white/90"
              : undefined
          }
        >
          Começar agora
        </Button>
      </Card>
    </div>
  );
}
