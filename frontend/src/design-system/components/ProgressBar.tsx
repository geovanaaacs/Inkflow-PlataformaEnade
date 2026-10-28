import { cn } from "@/design-system/utils/cn";
import type { ProgressTone } from "@/design-system/utils/progress-tone";
export type { ProgressTone } from "@/design-system/utils/progress-tone";

const toneClasses: Record<ProgressTone, string> = {
  brand: "bg-brand-bar-a80",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label: string;
  className?: string;
}

/** Thin progress/percentage indicator used across dashboard stat blocks. */
export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  label,
  className,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-badge bg-neutral-quaternary",
        className
      )}
    >
      <div
        className={cn("h-full rounded-badge transition-all", toneClasses[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
