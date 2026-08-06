import type { ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-900 text-white",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-black/5 text-ink-strong",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/** Small rounded label — "Pro", "Hoje", status pills, etc. */
export function Badge({ children, tone = "brand", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
