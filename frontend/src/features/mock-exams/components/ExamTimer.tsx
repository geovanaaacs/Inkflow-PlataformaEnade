import { Timer } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { formatCountdown } from "../format";

interface ExamTimerProps {
  remainingMs: number;
}

const FIVE_MINUTES = 5 * 60_000;
const ONE_MINUTE = 60_000;

/** Countdown display. Screen readers are told only at the 5 min and 1 min marks. */
export function ExamTimer({ remainingMs }: ExamTimerProps) {
  const tone =
    remainingMs <= ONE_MINUTE
      ? "bg-danger-bg text-danger"
      : remainingMs <= FIVE_MINUTES
        ? "bg-warning/15 text-warning"
        : "bg-brand-500-a24 text-brand-900";

  const announcement =
    remainingMs <= 0
      ? "Tempo esgotado."
      : remainingMs <= ONE_MINUTE
        ? "Resta menos de 1 minuto."
        : remainingMs <= FIVE_MINUTES
          ? "Restam menos de 5 minutos."
          : "";

  return (
    <div className={cn("flex items-center gap-2 rounded-button px-4 py-2", tone)}>
      <Timer aria-hidden="true" className="size-5" />
      <span className="sr-only">Tempo restante:</span>
      <span role="timer" className="text-xl font-bold tabular-nums">
        {formatCountdown(remainingMs)}
      </span>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
}
