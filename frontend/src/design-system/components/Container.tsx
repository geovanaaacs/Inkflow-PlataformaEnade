import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

/** Centers content at the 1160px reading width used throughout the app. */
export function Container({
  as: Tag = "div",
  children,
  className,
  ...rest
}: ContainerProps) {
  return (
    <Tag
      className={cn("mx-auto max-w-content px-4 sm:px-8 lg:px-10", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
