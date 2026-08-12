import type { ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { Card } from "@/design-system/components/Card";
import { IconBadge, type IconBadgeTone } from "@/design-system/components/IconBadge";
import { ProgressBar, type ProgressTone } from "@/design-system/components/ProgressBar";

interface StatCardProps {
  icon: ReactNode;
  tone?: IconBadgeTone;
  value: string;
  label: string;
  progressPercent: number;
  progressTone?: ProgressTone;
  delta: string;
  deltaPositive?: boolean;
}

/** Dashboard KPI card: icon, big number, label, progress bar, delta. */
export function StatCard({
  icon,
  tone = "brand",
  value,
  label,
  progressPercent,
  progressTone = "brand",
  delta,
  deltaPositive = true,
}: StatCardProps) {
  return (
    <Card as="article" className="flex flex-col gap-3.5">
      <div className="flex items-center gap-4">
        <IconBadge icon={icon} tone={tone} />
        <p className="text-2xl font-semibold leading-none text-ink-strong sm:text-3xl">{value}</p>
      </div>
      <p className="text-sm text-ink-strong sm:text-base">{label}</p>
      <ProgressBar value={progressPercent} label={label} tone={progressTone} />
      <p
        className={`flex items-center gap-1 text-sm font-semibold ${
          deltaPositive ? "text-success" : "text-ink-strong"
        }`}
      >
        {deltaPositive && <ArrowUp aria-hidden="true" className="size-3.5" />}
        {delta}
      </p>
    </Card>
  );
}
