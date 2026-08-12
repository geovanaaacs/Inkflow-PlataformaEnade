import { Link } from "react-router-dom";
import { cn } from "@/design-system/utils/cn";

interface PlanBannerProps {
  planName: string;
  used: number;
  total: number;
}

/** Free-tier usage banner shown at the top of Dashboard/Questões/Perfil. */
export function PlanBanner({ planName, used, total }: PlanBannerProps) {
  const dots = Array.from({ length: total }, (_, index) => index < used);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-gradient-to-r from-brand-900 to-brand-600 px-6 py-4 text-white">
      <span className="text-sm font-semibold">{planName}</span>

      <div
        className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3"
        role="group"
        aria-label={`${used} de ${total} questões gratuitas usadas hoje`}
      >
        <ul className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
          {dots.map((filled, index) => (
            <li
              key={index}
              className={cn(
                "size-3.5 rounded-full border border-white",
                filled ? "bg-white" : "bg-transparent"
              )}
            />
          ))}
        </ul>
        <span className="text-sm">
          {used}/{total} questões hoje
        </span>
      </div>

      <Link to="/planos" className="text-sm font-semibold underline-offset-2 hover:underline">
        Faça upgrade para ilimitado →
      </Link>
    </div>
  );
}
