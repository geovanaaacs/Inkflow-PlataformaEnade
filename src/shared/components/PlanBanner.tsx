import { Link } from "react-router-dom";
import { cn } from "@/design-system/utils/cn";
import { useReturnToState } from "@/shared/navigation/return-to";
import { PLAN_LABEL, type DailyUsage, type PlanId } from "@/shared/plans/plan-access";

interface PlanBannerProps {
  planId: PlanId;
  usage: DailyUsage;
}

/**
 * Plan status banner shown at the top of Dashboard/Questões: daily usage
 * dots for the free plan, "questões ilimitadas" for paid plans.
 */
export function PlanBanner({ planId, usage }: PlanBannerProps) {
  const returnState = useReturnToState();
  const planName = `Plano ${PLAN_LABEL[planId]}${planId === "basico" ? " (gratuito)" : ""}`;

  const upgradeLink =
    planId === "premium" ? null : (
      <Link
        to="/planos"
        state={returnState}
        className="text-sm font-semibold underline-offset-2 hover:underline"
      >
        {planId === "basico" ? "Faça upgrade para ilimitado →" : "Conheça o Premium →"}
      </Link>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-4 text-white">
      <span className="text-sm font-semibold">{planName}</span>

      {usage.limit === null ? (
        <span className="text-sm">
          Questões ilimitadas · {usage.used} {usage.used === 1 ? "respondida" : "respondidas"} hoje
        </span>
      ) : (
        <div
          className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3"
          role="group"
          aria-label={`${usage.used} de ${usage.limit} questões gratuitas usadas hoje`}
        >
          <ul className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: usage.limit }, (_, index) => (
              <li
                key={index}
                className={cn(
                  "size-3.5 rounded-full border border-white",
                  index < usage.used ? "bg-white" : "bg-transparent"
                )}
              />
            ))}
          </ul>
          <span className="text-sm">
            {Math.min(usage.used, usage.limit)}/{usage.limit} questões hoje
          </span>
        </div>
      )}

      {upgradeLink ?? <span className="text-sm font-semibold">Acesso completo</span>}
    </div>
  );
}
