import { Card } from "@/design-system/components/Card";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { toneForPercent } from "@/design-system/utils/progress-tone";
import type { AreaPerformance } from "../data";

interface AreaPerformanceCardProps {
  areas: AreaPerformance[];
}

export function AreaPerformanceCard({ areas }: AreaPerformanceCardProps) {
  return (
    <Card as="section" aria-labelledby="area-performance-heading">
      <h2 id="area-performance-heading" className="text-lg font-semibold text-ink-strong">
        Desempenho por Área de TI
      </h2>
      <p className="mt-1 text-sm text-ink-muted">% de acerto · questões respondidas</p>

      <ul className="mt-6 flex flex-col gap-4">
        {areas.map((area) => (
          <li key={area.area} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[140px_1fr_44px_90px]">
            <span className="text-sm text-ink-strong">{area.area}</span>
            <ProgressBar
              value={area.percent}
              tone={toneForPercent(area.percent)}
              label={`${area.area}: ${area.percent}% de acerto`}
              className="order-3 col-span-2 h-2.5 sm:order-none sm:col-span-1"
            />
            <span className="text-right text-sm font-semibold text-ink-strong sm:text-left">
              {area.percent}%
            </span>
            <span className="text-right text-sm text-ink-muted">
              {area.questionsCount} questões
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
