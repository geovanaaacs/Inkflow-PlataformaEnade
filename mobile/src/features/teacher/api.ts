import { http } from "../../lib/http";
import type { AvailabilitySlot, RequestWithSlot, SessionType } from "../mentoring/api";
import type { Area } from "../questions/api";

/*
 * Teacher API (same routes as frontend/src/features/teacher/api.ts and the
 * teacher half of frontend/src/features/mentoring/api.ts):
 *   GET    /api/teacher/overview
 *   GET    /api/teacher/slots          POST /api/teacher/slots      DELETE /api/teacher/slots/{id}
 *   GET    /api/teacher/mentoring-requests
 *   POST   /api/teacher/mentoring-requests/{id}/accept | /decline
 */

export interface StudentAnswerRow {
  id: string;
  studentId: string;
  studentName: string;
  questionCode: string;
  topic: string;
  area: Area;
  selectedOptionId: string;
  correctOptionId: string;
  correct: boolean;
  attemptNumber: number;
  /** Answered inside a mock exam instead of free practice. */
  fromMockExam: boolean;
  answeredAt: string;
}

export interface MissedQuestion {
  questionCode: string;
  topic: string;
  areaName: string;
  answers: number;
  errorRate: number;
  /** Wrong option chosen most often, with its share of all answers. */
  commonMistake: { optionId: string; percent: number } | null;
}

/** Only answers given as a student count. */
export interface TeacherOverview {
  totalAnswers: number;
  activeStudents: number;
  accuracyPercent: number;
  answersToday: number;
  pendingRequests: number;
  mostMissed: MissedQuestion[];
  /** Newest answers (up to 500); the totals cover every answer. */
  rows: StudentAnswerRow[];
  students: { id: string; name: string }[];
  areas: Area[];
}

export interface TeacherSlot extends AvailabilitySlot {
  confirmed: number;
  pending: number;
}

export interface NewSlotInput {
  type: SessionType;
  /** "YYYY-MM-DD" in Brasília time (the server converts it to UTC). */
  date: string;
  /** "HH:mm" in Brasília time. */
  time: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
}

export function getTeacherOverview(): Promise<TeacherOverview> {
  return http.get<TeacherOverview>("/teacher/overview");
}

/** Every slot the teacher opened (past and future), in chronological order. */
export function listTeacherSlots(): Promise<TeacherSlot[]> {
  return http.get<TeacherSlot[]>("/teacher/slots");
}

export function createSlot(input: NewSlotInput): Promise<AvailabilitySlot> {
  return http.post<AvailabilitySlot>("/teacher/slots", input);
}

/** Cancels a slot (kept in the students' history); its active requests are declined. */
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
