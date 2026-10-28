import type { Question } from "@/features/questions/data";
import { http } from "@/shared/api/http";
import type { AttemptStatus, MockExam, MockExamAttempt } from "./data";

/*
 * Mock exams API:
 *   GET  /api/mock-exams                          GET  /api/mock-exams/{id}
 *   GET  /api/mock-exams/{id}/active-attempt      POST /api/mock-exams/{id}/attempts
 *   PUT  /api/mock-exam-attempts/{id}/answers/{questionId}
 *   POST /api/mock-exam-attempts/{id}/finish      GET  /api/mock-exam-attempts/{id}
 * The server closes attempts whose time ran out and grades them.
 */

export interface MockExamSummary extends MockExam {
  questionCount: number;
  /** Attempt in progress (the student can resume it). */
  activeAttemptId: string | null;
  lastResult: {
    attemptId: string;
    correctCount: number;
    total: number;
    finishedAt: string;
    status: AttemptStatus;
  } | null;
}

export interface MockExamWithQuestions {
  exam: MockExam;
  questions: Question[];
}

export interface AttemptDetails extends MockExamWithQuestions {
  attempt: MockExamAttempt;
}

/** Catalog is visible to every student; starting an exam requires Premium. */
export function listMockExams(): Promise<MockExamSummary[]> {
  return http.get<MockExamSummary[]>("/mock-exams");
}

export function getMockExam(examId: string): Promise<MockExamWithQuestions> {
  return http.get<MockExamWithQuestions>(`/mock-exams/${examId}`);
}

/** The student's in-progress attempt for this exam, if any (overdue ones get closed). */
export function getActiveAttempt(examId: string): Promise<MockExamAttempt | null> {
  return http.get<MockExamAttempt | null>(`/mock-exams/${examId}/active-attempt`);
}

/** Starts the timer. Returns the existing attempt if one is already running. */
export function startAttempt(examId: string): Promise<MockExamAttempt> {
  return http.post<MockExamAttempt>(`/mock-exams/${examId}/attempts`);
}

export function saveAttemptAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string
): Promise<void> {
  return http.put(`/mock-exam-attempts/${attemptId}/answers/${questionId}`, { selectedOptionId });
}

/** Finishes the exam — by the student, or automatically when the timer hits zero. */
export function finishAttempt(attemptId: string): Promise<MockExamAttempt> {
  return http.post<MockExamAttempt>(`/mock-exam-attempts/${attemptId}/finish`);
}

export function getAttemptDetails(attemptId: string): Promise<AttemptDetails> {
  return http.get<AttemptDetails>(`/mock-exam-attempts/${attemptId}`);
}
