import { cn } from "@/design-system/utils/cn";

export type LogoSize = "sm" | "md";

interface LogoProps {
  className?: string;
  size?: LogoSize;
  showText?: boolean;
}

const sizeClasses: Record<LogoSize, string> = {
  md: "size-24 shrink-0",
  sm: "size-12 shrink-0",
};

/** Inkflow wordmark + mark, reused in every navbar and the auth screens. */
export function Logo({ className, size="sm", showText=true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/assets/logo.svg"
        alt="Inkflow Logo"
        className={cn(sizeClasses[size])}
      />
      {showText && (
        <span className="text-2xl font-semibold text-brand-800">Inkflow</span>
        )}
      </span>
  );
}
