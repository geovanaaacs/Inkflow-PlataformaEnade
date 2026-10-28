import type { ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type IconBadgeTone = "brand" | "success" | "warning" | "danger";

const toneClasses: Record<IconBadgeTone, string> = {
  brand: "bg-brand-500-a24 text-brand-800",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger-bg text-danger",
};

export type IconBadgeSize = "sm" | "md";

const sizeClasses: Record<IconBadgeSize, string> = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-10 [&_svg]:size-[18px]",
};

interface IconBadgeProps {
  icon: ReactNode;
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  className?: string;
}

/** Small rounded-square icon container used across cards and stats. */
export function IconBadge({
  icon,
  tone = "brand",
  size = "md",
  className,
}: IconBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-badge",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {icon}
    </span>
  );
}
