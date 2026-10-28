import type { Area } from "@/features/questions/data";
import { http } from "@/shared/api/http";

/*
 * Teacher dashboard API:
 *   GET /api/teacher/overview
 * Only answers given as a student count; the table is filtered on screen.
 */

export type ResultFilter = "todos" | "acertos" | "erros";

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
  /** Answered inside a mock exam (simulado) instead of free practice. */
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

export interface TeacherOverview {
  totalAnswers: number;
  activeStudents: number;
  accuracyPercent: number;
  answersToday: number;
  pendingRequests: number;
  mostMissed: MissedQuestion[];
  /** Newest answers (up to 500); the totals above cover every answer. */
  rows: StudentAnswerRow[];
  students: { id: string; name: string }[];
  areas: Area[];
}

export function getTeacherOverview(): Promise<TeacherOverview> {
  return http.get<TeacherOverview>("/teacher/overview");
}
