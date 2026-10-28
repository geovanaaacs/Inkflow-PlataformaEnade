import { Clock, GraduationCap, Users } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import type { OpenSlot } from "../api";
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE, formatSlotTime } from "../format";

interface SlotListProps {
  slots: OpenSlot[];
  onRequest: (slot: OpenSlot) => void;
}

/** Time slots of the selected day, with the student's request status or a "Solicitar" action. */
export function SlotList({ slots, onRequest }: SlotListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {slots.map((slot) => (
        <li
          key={slot.id}
          className="flex flex-col gap-3 rounded-input border border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-semibold text-ink-strong">
              <Clock aria-hidden="true" className="size-4 text-brand-800" />
              {formatSlotTime(slot.startsAt, slot.durationMinutes)}
            </p>
            <p className="mt-1 text-sm text-ink-strong">{slot.topic}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <GraduationCap aria-hidden="true" className="size-3.5" />
                {slot.teacherName}
              </span>
              <span className="flex items-center gap-1">
                <Users aria-hidden="true" className="size-3.5" />
                {slot.spotsLeft > 0
                  ? `${slot.spotsLeft} de ${slot.capacity} vagas`
                  : "Sem vagas"}
              </span>
            </p>
          </div>

          {slot.myRequest ? (
            <Badge tone={REQUEST_STATUS_TONE[slot.myRequest.status]} className="w-fit shrink-0">
              {REQUEST_STATUS_LABEL[slot.myRequest.status]}
            </Badge>
          ) : (
            <Button
              size="sm"
              className="shrink-0"
              disabled={slot.spotsLeft === 0}
              onClick={() => onRequest(slot)}
              aria-label={`Solicitar vaga: ${slot.topic}, ${formatSlotTime(slot.startsAt, slot.durationMinutes)}`}
            >
              {slot.spotsLeft === 0 ? "Esgotado" : "Solicitar vaga"}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
