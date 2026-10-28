import { cn } from "@/design-system/utils/cn";

export type LogoSize = "sm" | "md";

interface LogoProps {
  className?: string;
  size?: LogoSize;
  showText?: boolean;
  imgClassName?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  md: "size-14 sm:size-18 lg:size-24 shrink-0",
  sm: "size-10 sm:size-12 shrink-0",
};

/** Inkflow wordmark + mark, reused in every navbar and the auth screens. */
export function Logo({ className, size="sm", showText=true, imgClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/logo.svg"
        alt="Inkflow Logo"
        className={cn(sizeClasses[size], imgClassName)}
      />
      {showText && (
        <span className="hidden sm:inline text-2xl font-semibold text-brand-800">Inkflow</span>
      )}
    </span>
  );
}
