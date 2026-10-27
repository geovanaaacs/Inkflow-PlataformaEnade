import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import type { MentoringRequest } from "@/features/mentoring/data";
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE } from "@/features/mentoring/format";
import type { ReactNode } from "react";

interface RequestItemProps {
  request: MentoringRequest;
  /** Extra line under the student name (e.g. the session date). */
  details?: ReactNode;
  busy: boolean;
  onRespond: (requestId: string, decision: "confirmada" | "recusada") => void;
}

/** One student request with accept/decline actions while it is pending. */
export function RequestItem({ request, details, busy, onRespond }: RequestItemProps) {
  const statusLabel =
    request.status === "pendente" ? "Pendente" : REQUEST_STATUS_LABEL[request.status];

  return (
    <li className="flex flex-col gap-3 rounded-input bg-black/[0.03] p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-strong">{request.studentName}</p>
        {details && <div className="text-xs text-ink-muted">{details}</div>}
        {request.message && (
          <p className="mt-1 text-sm italic text-ink-strong">“{request.message}”</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {request.status === "pendente" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onRespond(request.id, "recusada")}
              aria-label={`Recusar solicitação de ${request.studentName}`}
            >
              Recusar
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onRespond(request.id, "confirmada")}
              aria-label={`Aceitar solicitação de ${request.studentName}`}
            >
              Aceitar
            </Button>
          </>
        ) : (
          <Badge tone={REQUEST_STATUS_TONE[request.status]}>{statusLabel}</Badge>
        )}
      </div>
    </li>
  );
}
