import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Removes the default shadow/padding for callers that need a bare surface. */
  bare?: boolean;
}

/**
 * Base elevated surface reused by every card-shaped block in the product
 * (feature cards, dashboard cards, plan cards, question cards, ...).
 */
export function Card({
  as: Tag = "div",
  children,
  className,
  bare = false,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card bg-app-surface",
        !bare && "shadow-card p-6 sm:p-8",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
