/**
 * Names of the mock "tables" kept by mock-store.ts. Several feature api.ts
 * files read the same collection (e.g. questions is read by the question bank
 * and edited by the admin area), just like several endpoints share a table.
 */
export const COLLECTIONS = {
  users: "users",
  questions: "questions",
  answers: "answers",
  notes: "notes",
  mockExams: "mockExams",
  mockExamAttempts: "mockExamAttempts",
  mentoringSlots: "mentoringSlots",
  mentoringRequests: "mentoringRequests",
} as const;
