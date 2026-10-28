import type { ReactNode } from "react";
import { Card } from "./Card";
import { IconBadge, type IconBadgeTone } from "./IconBadge";
import { cn } from "@/design-system/utils/cn";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: IconBadgeTone;
  footer?: ReactNode;
  className?: string;
}

/**
 * Icon + title + description card, the most repeated block in the product
 * (landing tools grid, "how it works" steps, dashboard suggestions, ...).
 */
export function FeatureCard({
  icon,
  title,
  description,
  tone = "brand",
  footer,
  className,
}: FeatureCardProps) {
  return (
    <Card className={cn("flex h-full flex-col gap-3", className)}>
      <IconBadge icon={icon} tone={tone} />
      <h3 className="text-base font-semibold text-ink-strong">{title}</h3>
      <p className="text-base text-ink-muted">{description}</p>
      {footer && <div className="mt-auto pt-2">{footer}</div>}
    </Card>
  );
}
