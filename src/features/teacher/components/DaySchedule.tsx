import { Trash2 } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import type { RequestWithSlot, TeacherSlot } from "@/features/mentoring/api";
import { SESSION_TYPE_LABEL } from "@/features/mentoring/data";
import { formatSlotTime } from "@/features/mentoring/format";
import { RequestItem } from "./RequestItem";

interface DayScheduleProps {
  slots: TeacherSlot[];
  requests: RequestWithSlot[];
  busyRequestId: string | null;
  onRespond: (requestId: string, decision: "confirmada" | "recusada") => void;
  onDelete: (slot: TeacherSlot) => void;
}

/** The teacher's slots on the selected day, each with its student requests. */
export function DaySchedule({ slots, requests, busyRequestId, onRespond, onDelete }: DayScheduleProps) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nenhum horário neste dia. Use “Abrir novo horário” para disponibilizar um encontro.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {slots.map((slot) => {
        const slotRequests = requests.filter(
          (request) => request.slotId === slot.id && request.status !== "cancelada"
        );
        const past = new Date(slot.startsAt).getTime() < Date.now();

        return (
          <li key={slot.id} className="rounded-input border border-black/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone={slot.type === "mentoria" ? "brand" : "neutral"}>
                  {SESSION_TYPE_LABEL[slot.type]}
                </Badge>
                <p className="mt-2 text-base font-semibold text-ink-strong">
                  {formatSlotTime(slot.startsAt, slot.durationMinutes)} · {slot.topic}
                </p>
                <p className="text-sm text-ink-muted">
                  {slot.confirmed} {slot.confirmed === 1 ? "confirmado" : "confirmados"} ·{" "}
                  {slot.pending} {slot.pending === 1 ? "pendente" : "pendentes"} · {slot.capacity} vagas
                  {past && " · encerrado"}
                </p>
              </div>
              {!past && (
                <Button
                  size="sm"
                  variant="danger"
                  leadingIcon={<Trash2 aria-hidden="true" className="size-4" />}
                  onClick={() => onDelete(slot)}
                  aria-label={`Remover horário: ${slot.topic}`}
                >
                  Remover
                </Button>
              )}
            </div>

            {slotRequests.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2" aria-label={`Solicitações para ${slot.topic}`}>
                {slotRequests.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    busy={busyRequestId !== null}
                    onRespond={onRespond}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">Nenhuma solicitação ainda.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
