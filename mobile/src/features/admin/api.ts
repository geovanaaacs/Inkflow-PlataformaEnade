import { http, queryString } from "../../lib/http";
import type { AuthUser, PlanId, UserRole } from "../auth/api";
import type { MockExam } from "../mock-exams/api";
import type { Area, Difficulty, Question } from "../questions/api";

/*
 * Admin API — only the "admin" profile (same routes as frontend/src/features/admin/api.ts):
 *   GET  /api/admin/users?search=&role=          PATCH  /api/admin/users/{id}  { role?, plan?, active? }
 *   GET  /api/admin/questions?search=&areaSlug=  GET    /api/admin/questions/catalog
 *   POST /api/admin/questions                    PUT    /api/admin/questions/{id}
 *   DELETE /api/admin/questions/{id}  (deactivates)
 *   GET  /api/admin/mock-exams  POST /api/admin/mock-exams  PUT /api/admin/mock-exams/{id}
 */

export const OPTION_IDS = ["a", "b", "c", "d", "e"] as const;

export interface AdminUser extends AuthUser {
  active: boolean;
}

export interface AdminUserChanges {
  role?: UserRole;
  plan?: PlanId | null;
  active?: boolean;
}

export interface QuestionInput {
  code: string;
  areaSlug: string;
  topic: string;
  year: number;
  difficulty: Difficulty;
  statement: string;
  /** Five option texts, a–e. */
  options: string[];
  correctOptionId: string;
  aiExplanation: string;
}

export interface QuestionCatalog {
  areas: Area[];
  /** Area slug → topics already used (suggestions for the form). */
  topicsByArea: Record<string, string[]>;
}

export interface MockExamInput {
  title: string;
  description: string;
  /** Area name, or null for "Várias áreas". */
  areaName: string | null;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  questionIds: string[];
}

export function listAdminUsers(filters: { search?: string; role?: UserRole } = {}): Promise<AdminUser[]> {
  return http.get<AdminUser[]>(`/admin/users${queryString({ search: filters.search?.trim(), role: filters.role })}`);
}

/** Changes profile, plan or access. Students always have a plan; staff never do. */
export function updateAdminUser(userId: string, changes: AdminUserChanges): Promise<AdminUser> {
  return http.patch<AdminUser>(`/admin/users/${userId}`, changes);
}

export function listAdminQuestions(filters: { search?: string; areaSlug?: string } = {}): Promise<Question[]> {
  return http.get<Question[]>(`/admin/questions${queryString({ search: filters.search?.trim(), areaSlug: filters.areaSlug })}`);
}

export function getQuestionCatalog(): Promise<QuestionCatalog> {
  return http.get<QuestionCatalog>("/admin/questions/catalog");
}

export function createQuestion(input: QuestionInput): Promise<Question> {
  return http.post<Question>("/admin/questions", input);
}

export function updateQuestion(questionId: string, input: QuestionInput): Promise<Question> {
  return http.put<Question>(`/admin/questions/${questionId}`, input);
}

/** Removes the question from the bank and from every mock exam (answers stay in history). */
export function deleteQuestion(questionId: string): Promise<void> {
  return http.delete(`/admin/questions/${questionId}`);
}

export function listAdminMockExams(): Promise<MockExam[]> {
  return http.get<MockExam[]>("/admin/mock-exams");
}

export function createMockExam(input: MockExamInput): Promise<MockExam> {
  return http.post<MockExam>("/admin/mock-exams", input);
}

export function updateMockExam(examId: string, input: MockExamInput): Promise<MockExam> {
  return http.put<MockExam>(`/admin/mock-exams/${examId}`, input);
}
