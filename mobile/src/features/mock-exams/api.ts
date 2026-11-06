import { http } from "../../lib/http";
import type { Difficulty, Question } from "../questions/api";

/*
 * Mock exams API (same routes as frontend/src/features/mock-exams/api.ts):
 *   GET  /api/mock-exams                          GET  /api/mock-exams/{id}
 *   GET  /api/mock-exams/{id}/active-attempt      POST /api/mock-exams/{id}/attempts
 *   PUT  /api/mock-exam-attempts/{id}/answers/{questionId}
 *   POST /api/mock-exam-attempts/{id}/finish      GET  /api/mock-exam-attempts/{id}
 * The catalog is open to every student; everything else requires Premium.
 * The server closes and grades attempts whose time ran out.
 */

export interface MockExam {
  id: string;
  title: string;
  description: string;
  /** null = several areas. */
  areaName: string | null;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  questionIds: string[];
}

export type AttemptStatus = "em_andamento" | "finalizado" | "expirado";

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

export interface MockExamAttempt {
  id: string;
  examId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string;
  /** startedAt + time limit — the timer counts down to this instant. */
  endsAt: string;
  finishedAt: string | null;
  /** questionId → selected option. */
  answers: Record<string, string>;
  results: { questionId: string; selectedOptionId: string | null; correctOptionId: string; correct: boolean }[] | null;
}

export interface MockExamWithQuestions {
  exam: MockExam;
  questions: Question[];
}

export interface AttemptDetails extends MockExamWithQuestions {
  attempt: MockExamAttempt;
}

export function listMockExams(): Promise<MockExamSummary[]> {
  return http.get<MockExamSummary[]>("/mock-exams");
}

export function getMockExam(examId: string): Promise<MockExamWithQuestions> {
  return http.get<MockExamWithQuestions>(`/mock-exams/${examId}`);
}

/** The in-progress attempt for this exam, or null. */
export function getActiveAttempt(examId: string): Promise<MockExamAttempt | null> {
  return http.get<MockExamAttempt | null>(`/mock-exams/${examId}/active-attempt`);
}

/** Starts the timer; returns the running attempt if there is one already. */
export function startAttempt(examId: string): Promise<MockExamAttempt> {
  return http.post<MockExamAttempt>(`/mock-exams/${examId}/attempts`);
}

export function saveAttemptAnswer(attemptId: string, questionId: string, selectedOptionId: string): Promise<void> {
  return http.put(`/mock-exam-attempts/${attemptId}/answers/${questionId}`, { selectedOptionId });
}

export function finishAttempt(attemptId: string): Promise<MockExamAttempt> {
  return http.post<MockExamAttempt>(`/mock-exam-attempts/${attemptId}/finish`);
}

export function getAttemptDetails(attemptId: string): Promise<AttemptDetails> {
  return http.get<AttemptDetails>(`/mock-exam-attempts/${attemptId}`);
}
