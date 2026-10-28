import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/design-system/components/SegmentedControl";
import type { RequestWithSlot } from "@/features/mentoring/api";
import { SESSION_TYPE_LABEL } from "@/features/mentoring/data";
import { formatSlotDate, formatSlotTime } from "@/features/mentoring/format";
import { dayKey } from "@/shared/utils/dates";
import { RequestItem } from "./RequestItem";

type RequestFilter = "pendente" | "confirmada" | "todas";

const filterOptions: SegmentedControlOption<RequestFilter>[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "todas", label: "Todas" },
];

interface TeacherRequestsCardProps {
  requests: RequestWithSlot[];
  busyRequestId: string | null;
  onRespond: (requestId: string, decision: "confirmada" | "recusada") => void;
  onShowDay: (dateKey: string) => void;
}

/** All requests for the teacher's slots — mentoria coletiva and grupos de estudo. */
export function TeacherRequestsCard({
  requests,
  busyRequestId,
  onRespond,
  onShowDay,
}: TeacherRequestsCardProps) {
  const [filter, setFilter] = useState<RequestFilter>("pendente");
  const pendingCount = requests.filter((request) => request.status === "pendente").length;
  const visible = requests.filter((request) =>
    filter === "todas" ? true : request.status === filter
  );

  return (
    <Card as="section" aria-labelledby="teacher-requests-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="teacher-requests-heading" className="text-lg font-semibold text-ink-strong">
            Solicitações dos alunos
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {pendingCount} aguardando resposta
          </p>
        </div>
        <SegmentedControl
          aria-label="Filtrar solicitações"
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-auto [&_button]:h-9 [&_button]:px-4 [&_button]:text-sm"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Nenhuma solicitação neste filtro.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {visible.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              busy={busyRequestId !== null}
              onRespond={onRespond}
              details={
                <span className="flex flex-wrap items-center gap-x-2">
                  <span>
                    {SESSION_TYPE_LABEL[request.slot.type]} · {request.slot.topic} ·{" "}
                    {formatSlotDate(request.slot.startsAt)},{" "}
                    {formatSlotTime(request.slot.startsAt, request.slot.durationMinutes)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-1 py-0 text-xs text-brand-800 underline"
                    onClick={() => onShowDay(dayKey(new Date(request.slot.startsAt)))}
                  >
                    ver no calendário
                  </Button>
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
