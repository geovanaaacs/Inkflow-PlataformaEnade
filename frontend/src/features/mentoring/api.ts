import { http, queryString } from "@/shared/api/http";
import type { AvailabilitySlot, MentoringRequest, RequestStatus, SessionType } from "./data";

/*
 * Mentoring API (aluno Premium):
 *   GET  /api/mentoring/slots?type=mentoria|grupo
 *   POST /api/mentoring/slots/{id}/requests       GET /api/me/mentoring-requests
 *   POST /api/me/mentoring-requests/{id}/cancel
 */

export interface OpenSlot extends AvailabilitySlot {
  spotsLeft: number;
  /** The student's own active request for this slot, if any. */
  myRequest: { id: string; status: RequestStatus } | null;
}

export interface RequestWithSlot extends MentoringRequest {
  slot: AvailabilitySlot;
}

/** Future times offered by the teachers for one session type, soonest first. */
export function listOpenSlots(type: SessionType): Promise<OpenSlot[]> {
  return http.get<OpenSlot[]>(`/mentoring/slots${queryString({ type })}`);
}

export function requestSlot(slotId: string, message: string): Promise<MentoringRequest> {
  return http.post<MentoringRequest>(`/mentoring/slots/${slotId}/requests`, { message });
}

/** The student's requests (all statuses), upcoming sessions first. */
export function listMyRequests(): Promise<RequestWithSlot[]> {
  return http.get<RequestWithSlot[]>("/me/mentoring-requests");
}

export function cancelMyRequest(requestId: string): Promise<void> {
  return http.post(`/me/mentoring-requests/${requestId}/cancel`);
}

/* ------------------------------------------------------------------ Professor */

/*
 * Endpoints (professor):
 *   GET    /api/teacher/slots          POST /api/teacher/slots      DELETE /api/teacher/slots/{id}
 *   GET    /api/teacher/mentoring-requests
 *   POST   /api/teacher/mentoring-requests/{id}/accept | /decline
 */

export interface TeacherSlot extends AvailabilitySlot {
  confirmed: number;
  pending: number;
}

export interface NewSlotInput {
  type: SessionType;
  /** Date "YYYY-MM-DD" in Brasília time (the server converts it to UTC). */
  date: string;
  /** Time "HH:mm" in Brasília time. */
  time: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
}

/** Every slot the teacher opened (past and future), in chronological order. */
export function listTeacherSlots(): Promise<TeacherSlot[]> {
  return http.get<TeacherSlot[]>("/teacher/slots");
}

export function createSlot(input: NewSlotInput): Promise<AvailabilitySlot> {
  return http.post<AvailabilitySlot>("/teacher/slots", input);
}

/**
 * Cancels a slot (soft delete, so students still see it in their history).
 * Active requests for it are declined.
 */
export function deleteSlot(slotId: string): Promise<void> {
  return http.delete(`/teacher/slots/${slotId}`);
}

/** Requests for the teacher's slots, soonest session first. */
export function listTeacherRequests(): Promise<RequestWithSlot[]> {
  return http.get<RequestWithSlot[]>("/teacher/mentoring-requests");
}

export function respondToRequest(requestId: string, decision: "confirmada" | "recusada"): Promise<void> {
  return http.post(`/teacher/mentoring-requests/${requestId}/${decision === "confirmada" ? "accept" : "decline"}`);
}
