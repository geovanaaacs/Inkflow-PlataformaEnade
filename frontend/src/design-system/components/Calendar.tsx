import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/design-system/utils/cn";

/** Local calendar day as "YYYY-MM-DD". */
function toKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key: string, days: number): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return toKey(date);
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface CalendarDayMarker {
  /** Small number shown under the day (e.g. available time slots). */
  count: number;
  /** Screen-reader description, e.g. "3 horários disponíveis". */
  label: string;
  tone?: "brand" | "warning" | "success";
}

export interface CalendarProps {
  /** Any date inside the month being shown. */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** Selected day as "YYYY-MM-DD". */
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  markers?: Record<string, CalendarDayMarker>;
  /** Days that can't be picked (still focusable for keyboard navigation). */
  isDateDisabled?: (dateKey: string) => boolean;
  label: string;
  className?: string;
}

const markerTone = {
  brand: "bg-brand-600 text-white",
  warning: "bg-warning text-white",
  success: "bg-success text-white",
};

/**
 * Month grid date picker (pt-BR). Arrow keys move between days (crossing
 * months), Home/End jump to the start/end of the week, Enter/Space selects.
 */
export function Calendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  markers = {},
  isDateDisabled,
  label,
  className,
}: CalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const todayKey = toKey(new Date());
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const [focusedDate, setFocusedDate] = useState<string>(selectedDate ?? todayKey);

  // Keep the roving focus inside the visible month.
  const visibleMonth = toKey(monthStart).slice(0, 7);
  const focusKey = focusedDate.slice(0, 7) === visibleMonth ? focusedDate : toKey(monthStart);

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusKey}"]`)?.focus();
  }, [focusKey]);

  const firstCell = new Date(monthStart);
  firstCell.setDate(1 - monthStart.getDay());
  const cells = Array.from({ length: 42 }, (_, index) => addDays(toKey(firstCell), index));
  const weeks = Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7)).filter(
    (week) => week.some((key) => key.slice(0, 7) === visibleMonth)
  );

  const monthLabel = monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function changeMonth(offset: number) {
    onMonthChange(new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1));
  }

  function moveFocus(nextKey: string) {
    shouldFocus.current = true;
    setFocusedDate(nextKey);
    if (nextKey.slice(0, 7) !== visibleMonth) {
      const next = fromKey(nextKey);
      onMonthChange(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const weekday = fromKey(key).getDay();
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(addDays(key, moves[event.key]));
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-button p-2 text-ink-strong hover:bg-black/5"
          aria-label="Mês anterior"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <p className="text-base font-semibold capitalize text-ink-strong" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-button p-2 text-ink-strong hover:bg-black/5"
          aria-label="Próximo mês"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div ref={gridRef} role="grid" aria-label={`${label} — ${monthLabel}`} className="flex flex-col gap-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((weekday, index) => (
            <span
              key={weekday}
              role="columnheader"
              aria-label={WEEKDAYS_FULL[index]}
              className="py-1 text-center text-xs font-semibold uppercase text-ink-muted"
            >
              {weekday}
            </span>
          ))}
        </div>

        {weeks.map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7 gap-1">
            {week.map((key) => {
              const inMonth = key.slice(0, 7) === visibleMonth;
              if (!inMonth) return <span key={key} role="gridcell" aria-hidden="true" />;

              const date = fromKey(key);
              const marker = markers[key];
              const disabled = isDateDisabled?.(key) ?? false;
              const selected = key === selectedDate;
              const isToday = key === todayKey;
              const dayLabel = date.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              });

              return (
                <span key={key} role="gridcell" aria-selected={selected}>
                  <button
                    type="button"
                    data-date={key}
                    tabIndex={key === focusKey ? 0 : -1}
                    aria-disabled={disabled || undefined}
                    aria-label={`${dayLabel}${isToday ? ", hoje" : ""}${marker ? `, ${marker.label}` : ""}`}
                    onClick={() => {
                      setFocusedDate(key);
                      if (!disabled) onSelectDate(key);
                    }}
                    onKeyDown={(event) => handleKeyDown(event, key)}
                    className={cn(
                      "flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-dropdown text-sm transition-colors",
                      selected
                        ? "bg-brand-600 font-semibold text-white"
                        : disabled
                          ? "cursor-default text-ink-muted/60"
                          : "text-ink-strong hover:bg-brand-500-a24",
                      isToday && !selected && "ring-1 ring-brand-600"
                    )}
                  >
                    {date.getDate()}
                    {marker && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "min-w-4 rounded-full px-1 text-[10px] font-semibold leading-4",
                          selected ? "bg-white text-brand-800" : markerTone[marker.tone ?? "brand"]
                        )}
                      >
                        {marker.count}
                      </span>
                    )}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
