import { requireSessionUser } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/auth-context";
import { getQuestionsByIds, recordMockExamAnswers } from "@/features/questions/api";
import type { Question } from "@/features/questions/data";
import { ApiError } from "@/shared/api/api-error";
import { createId, mockDelay, readCollection, updateCollection } from "@/shared/api/mock-store";
import { hasFeature } from "@/shared/plans/plan-access";
import {
  mockExams,
  seedAttempts,
  type AttemptStatus,
  type MockExam,
  type MockExamAttempt,
} from "./data";

/*
 * Mock exams API (mock). Future endpoints:
 *   GET  /api/mock-exams                          GET  /api/mock-exams/{id}
 *   POST /api/mock-exams/{id}/attempts            PUT  /api/mock-exam-attempts/{id}/answers
 *   POST /api/mock-exam-attempts/{id}/finish      GET  /api/mock-exam-attempts/{id}
 */

const ATTEMPTS_KEY = "mockExamAttempts";
/** Tolerance for the client's timeout request arriving slightly after endsAt. */
const DEADLINE_GRACE_MS = 5_000;

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

function readAttempts(): MockExamAttempt[] {
  return readCollection(ATTEMPTS_KEY, seedAttempts);
}

function saveAttempt(attempt: MockExamAttempt): void {
  updateCollection(ATTEMPTS_KEY, seedAttempts, (attempts) =>
    attempts.some((item) => item.id === attempt.id)
      ? attempts.map((item) => (item.id === attempt.id ? attempt : item))
      : [...attempts, attempt]
  );
}

function findExam(examId: string): MockExam {
  const exam = mockExams.find((item) => item.id === examId);
  if (!exam) throw new ApiError("Simulado não encontrado.", 404);
  return exam;
}

function requireMockExamAccess(): AuthUser {
  const user = requireSessionUser();
  if (!hasFeature(user.plan, "mockExams")) {
    throw new ApiError("Os simulados fazem parte do plano Premium.", 403);
  }
  return user;
}

function findOwnAttempt(attemptId: string, user: AuthUser): MockExamAttempt {
  const attempt = readAttempts().find((item) => item.id === attemptId && item.userId === user.id);
  if (!attempt) throw new ApiError("Tentativa não encontrada.", 404);
  return attempt;
}

function isPastDeadline(attempt: MockExamAttempt): boolean {
  return Date.now() > new Date(attempt.endsAt).getTime() + DEADLINE_GRACE_MS;
}

/** Grades the attempt, records the answers in the student's history and closes it. */
async function closeAttempt(
  attempt: MockExamAttempt,
  status: Exclude<AttemptStatus, "em_andamento">
): Promise<MockExamAttempt> {
  const exam = findExam(attempt.examId);
  const results = await recordMockExamAnswers(
    attempt.id,
    exam.questionIds.map((questionId) => ({
      questionId,
      selectedOptionId: attempt.answers[questionId] ?? null,
    }))
  );
  const closed: MockExamAttempt = {
    ...attempt,
    status,
    // An expired attempt ends exactly when the time ran out.
    finishedAt: status === "expirado" ? attempt.endsAt : new Date().toISOString(),
    results,
  };
  saveAttempt(closed);
  return closed;
}

/** Closes in-progress attempts whose time ran out while the student was away. */
async function expireOverdueAttempts(user: AuthUser): Promise<void> {
  const overdue = readAttempts().filter(
    (attempt) =>
      attempt.userId === user.id && attempt.status === "em_andamento" && isPastDeadline(attempt)
  );
  for (const attempt of overdue) await closeAttempt(attempt, "expirado");
}

/** Catalog is visible to every student; starting an exam requires Premium. */
export async function listMockExams(): Promise<MockExamSummary[]> {
  await mockDelay();
  const user = requireSessionUser();
  if (hasFeature(user.plan, "mockExams")) await expireOverdueAttempts(user);
  const attempts = readAttempts().filter((attempt) => attempt.userId === user.id);

  return mockExams.map((exam) => {
    const own = attempts.filter((attempt) => attempt.examId === exam.id);
    const active = own.find((attempt) => attempt.status === "em_andamento") ?? null;
    const last = own
      .filter((attempt) => attempt.status !== "em_andamento" && attempt.finishedAt)
      .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))[0];

    return {
      ...exam,
      questionCount: exam.questionIds.length,
      activeAttemptId: active?.id ?? null,
      lastResult: last
        ? {
            attemptId: last.id,
            correctCount: last.results?.filter((result) => result.correct).length ?? 0,
            total: exam.questionIds.length,
            finishedAt: last.finishedAt ?? last.endsAt,
            status: last.status,
          }
        : null,
    };
  });
}

export async function getMockExam(examId: string): Promise<MockExamWithQuestions> {
  await mockDelay();
  requireMockExamAccess();
  const exam = findExam(examId);
  return { exam, questions: await getQuestionsByIds(exam.questionIds) };
}

/** The student's in-progress attempt for this exam, if any (overdue ones get closed). */
export async function getActiveAttempt(examId: string): Promise<MockExamAttempt | null> {
  const user = requireMockExamAccess();
  await expireOverdueAttempts(user);
  return (
    readAttempts().find(
      (attempt) =>
        attempt.userId === user.id &&
        attempt.examId === examId &&
        attempt.status === "em_andamento"
    ) ?? null
  );
}

/** Starts the timer. Returns the existing attempt if one is already running. */
export async function startAttempt(examId: string): Promise<MockExamAttempt> {
  await mockDelay(300);
  const user = requireMockExamAccess();
  const exam = findExam(examId);
  const existing = await getActiveAttempt(examId);
  if (existing) return existing;

  const startedAt = new Date();
  const attempt: MockExamAttempt = {
    id: createId("att"),
    examId: exam.id,
    userId: user.id,
    status: "em_andamento",
    startedAt: startedAt.toISOString(),
    endsAt: new Date(startedAt.getTime() + exam.timeLimitMinutes * 60_000).toISOString(),
    finishedAt: null,
    answers: {},
    results: null,
  };
  saveAttempt(attempt);
  return attempt;
}

export async function saveAttemptAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string
): Promise<void> {
  const user = requireMockExamAccess();
  const attempt = findOwnAttempt(attemptId, user);
  if (attempt.status !== "em_andamento" || isPastDeadline(attempt)) {
    throw new ApiError("O tempo deste simulado já acabou.", 409);
  }
  if (!findExam(attempt.examId).questionIds.includes(questionId)) {
    throw new ApiError("Esta questão não faz parte do simulado.", 400);
  }
  saveAttempt({ ...attempt, answers: { ...attempt.answers, [questionId]: selectedOptionId } });
}

/** Finishes the exam — by the student, or automatically when the timer hits zero. */
export async function finishAttempt(attemptId: string): Promise<MockExamAttempt> {
  await mockDelay(400);
  const user = requireMockExamAccess();
  const attempt = findOwnAttempt(attemptId, user);
  if (attempt.status !== "em_andamento") return attempt;
  const timedOut = Date.now() >= new Date(attempt.endsAt).getTime();
  return closeAttempt(attempt, timedOut ? "expirado" : "finalizado");
}

export async function getAttemptDetails(attemptId: string): Promise<AttemptDetails> {
  await mockDelay();
  const user = requireMockExamAccess();
  const attempt = findOwnAttempt(attemptId, user);
  const exam = findExam(attempt.examId);
  return { attempt, exam, questions: await getQuestionsByIds(exam.questionIds) };
}
