import type { BadgeTone } from "@/design-system/components/Badge";
import type { RequestStatus } from "./data";

/** "19:00 – 20:30". */
export function formatSlotTime(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const time = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${time(start)} – ${time(end)}`;
}

/** "quinta-feira, 25 de setembro". */
export function formatSlotDate(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pendente: "Aguardando professor",
  confirmada: "Confirmada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const REQUEST_STATUS_TONE: Record<RequestStatus, BadgeTone> = {
  pendente: "warning",
  confirmada: "success",
  recusada: "danger",
  cancelada: "neutral",
};
