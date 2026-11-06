import type { Tone } from "../../components/feedback";
import { http, queryString } from "../../lib/http";

/*
 * Mentoring API — student side, Premium (same routes as frontend/src/features/mentoring/api.ts):
 *   GET  /api/mentoring/slots?type=mentoria|grupo
 *   POST /api/mentoring/slots/{id}/requests  { message }
 *   GET  /api/me/mentoring-requests          POST /api/me/mentoring-requests/{id}/cancel
 */

export type SessionType = "mentoria" | "grupo";
export type RequestStatus = "pendente" | "confirmada" | "recusada" | "cancelada";

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  mentoria: "Mentoria coletiva",
  grupo: "Grupo de estudo",
};

export const SESSION_TYPE_DESCRIPTION: Record<SessionType, string> = {
  mentoria: "Aula ao vivo com um professor para toda a turma Premium: revisão de conteúdo e dúvidas abertas.",
  grupo: "Grupo pequeno guiado por um especialista, que define o que estudar e em que ordem.",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pendente: "Aguardando professor",
  confirmada: "Confirmada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const REQUEST_STATUS_TONE: Record<RequestStatus, Tone> = {
  pendente: "warning",
  confirmada: "success",
  recusada: "danger",
  cancelada: "brand",
};

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  teacherName: string;
  type: SessionType;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
  canceledAt?: string | null;
}

export interface OpenSlot extends AvailabilitySlot {
  spotsLeft: number;
  /** The student's own active request for this slot, if any. */
  myRequest: { id: string; status: RequestStatus } | null;
}

export interface MentoringRequest {
  id: string;
  slotId: string;
  studentId: string;
  studentName: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface RequestWithSlot extends MentoringRequest {
  slot: AvailabilitySlot;
}

/** Future slots of one type, soonest first. */
export function listOpenSlots(type: SessionType): Promise<OpenSlot[]> {
  return http.get<OpenSlot[]>(`/mentoring/slots${queryString({ type })}`);
}

export function requestSlot(slotId: string, message: string): Promise<MentoringRequest> {
  return http.post<MentoringRequest>(`/mentoring/slots/${slotId}/requests`, { message });
}

/** All the student's requests, upcoming sessions first. */
export function listMyRequests(): Promise<RequestWithSlot[]> {
  return http.get<RequestWithSlot[]>("/me/mentoring-requests");
}

export function cancelMyRequest(requestId: string): Promise<void> {
  return http.post(`/me/mentoring-requests/${requestId}/cancel`);
}
