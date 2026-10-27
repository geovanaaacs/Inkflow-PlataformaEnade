import { useState } from "react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Spinner } from "@/design-system/components/Spinner";
import { errorMessage } from "@/shared/api/api-error";
import { cancelMyRequest, type RequestWithSlot } from "../api";
import { SESSION_TYPE_LABEL } from "../data";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  formatSlotDate,
  formatSlotTime,
} from "../format";

interface MyRequestsCardProps {
  requests: RequestWithSlot[] | undefined;
  loading: boolean;
  onChanged: () => void;
}

export function MyRequestsCard({ requests, loading, onChanged }: MyRequestsCardProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(requestId: string) {
    setCancellingId(requestId);
    setError(null);
    try {
      await cancelMyRequest(requestId);
      onChanged();
    } catch (cancelError) {
      setError(errorMessage(cancelError));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <Card as="section" aria-labelledby="my-requests-heading">
      <h2 id="my-requests-heading" className="text-lg font-semibold text-ink-strong">
        Minhas solicitações
      </h2>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loading && !requests ? (
        <Spinner label="Carregando solicitações…" className="py-6" />
      ) : !requests || requests.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Você ainda não solicitou nenhum horário. Escolha um dia no calendário acima.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {requests.map((request) => {
            const past = new Date(request.slot.startsAt).getTime() < Date.now();
            const cancellable =
              !past &&
              !request.slot.canceledAt &&
              (request.status === "pendente" || request.status === "confirmada");
            return (
              <li
                key={request.id}
                className="flex flex-col gap-3 rounded-input border border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-brand-800">
                    {SESSION_TYPE_LABEL[request.slot.type]}
                  </p>
                  <p className="text-sm font-semibold text-ink-strong">{request.slot.topic}</p>
                  <p className="text-sm text-ink-muted first-letter:uppercase">
                    {formatSlotDate(request.slot.startsAt)} ·{" "}
                    {formatSlotTime(request.slot.startsAt, request.slot.durationMinutes)} ·{" "}
                    {request.slot.teacherName}
                    {request.slot.canceledAt
                      ? " · horário cancelado pelo professor"
                      : past && " · encerrado"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={REQUEST_STATUS_TONE[request.status]}>
                    {REQUEST_STATUS_LABEL[request.status]}
                  </Badge>
                  {cancellable && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={cancellingId !== null}
                      onClick={() => handleCancel(request.id)}
                      aria-label={`Cancelar solicitação: ${request.slot.topic}`}
                    >
                      {cancellingId === request.id ? "Cancelando..." : "Cancelar"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
