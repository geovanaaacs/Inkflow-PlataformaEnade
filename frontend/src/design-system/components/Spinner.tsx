import { LoaderCircle } from "lucide-react";
import { cn } from "@/design-system/utils/cn";

interface SpinnerProps {
  /** Announced to screen readers. */
  label?: string;
  className?: string;
}

/** Indeterminate loading indicator with an accessible status label. */
export function Spinner({ label = "Carregando…", className }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn("flex items-center justify-center gap-2 text-sm text-ink-muted", className)}
    >
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-brand-600" />
      <span>{label}</span>
    </div>
  );
}
