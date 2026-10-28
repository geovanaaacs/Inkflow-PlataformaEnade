import type { AuthUser, UserRole } from "@/features/auth/auth-context";
import type { MockExam } from "@/features/mock-exams/data";
import type { Area, Difficulty, Question } from "@/features/questions/data";
import { http, queryString } from "@/shared/api/http";
import type { PlanId } from "@/shared/plans/plan-access";

/*
 * Admin API (only the "admin" profile):
 *   GET  /api/admin/users?search=&role=        PATCH  /api/admin/users/{id}  { role, plan, active }
 *   GET  /api/admin/questions?search=&areaSlug= GET   /api/admin/questions/catalog
 *   POST /api/admin/questions                  PUT    /api/admin/questions/{id}
 *   DELETE /api/admin/questions/{id}
 *   GET  /api/admin/mock-exams                 POST   /api/admin/mock-exams
 *   PUT  /api/admin/mock-exams/{id}
 */

/* ------------------------------------------------------------------ Usuários */

export interface AdminUser extends AuthUser {
  active: boolean;
}

export interface AdminUserFilters {
  search?: string;
  role?: UserRole | "todos";
}

export interface AdminUserChanges {
  role?: UserRole;
  plan?: PlanId | null;
  active?: boolean;
}

export function listAdminUsers(filters: AdminUserFilters = {}): Promise<AdminUser[]> {
  return http.get<AdminUser[]>(
    `/admin/users${queryString({ search: filters.search?.trim(), role: filters.role })}`
  );
}

/** Changes profile, plan or access. Students always have a plan; staff never do. */
export function updateAdminUser(userId: string, changes: AdminUserChanges): Promise<AdminUser> {
  return http.patch<AdminUser>(`/admin/users/${userId}`, changes);
}

/* ------------------------------------------------------------------ Questões */

export const OPTION_IDS = ["a", "b", "c", "d", "e"] as const;

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

export function listAdminQuestions(filters: { search?: string; areaSlug?: string } = {}): Promise<Question[]> {
  return http.get<Question[]>(
    `/admin/questions${queryString({ search: filters.search?.trim(), areaSlug: filters.areaSlug })}`
  );
}

/** Areas plus the topics already used in each one (suggestions for the form). */
export function getQuestionCatalog(): Promise<{ areas: Area[]; topicsByArea: Record<string, string[]> }> {
  return http.get("/admin/questions/catalog");
}

export function createQuestion(input: QuestionInput): Promise<Question> {
  return http.post<Question>("/admin/questions", input);
}

export function updateQuestion(questionId: string, input: QuestionInput): Promise<Question> {
  return http.put<Question>(`/admin/questions/${questionId}`, input);
}

/**
 * Removes a question from the bank and from every mock exam. The server
 * deactivates it (Questions.IsActive) so answers already given stay in the
 * students' history.
 */
export function deleteQuestion(questionId: string): Promise<void> {
  return http.delete(`/admin/questions/${questionId}`);
}

/* ------------------------------------------------------------------ Simulados */

export interface MockExamInput {
  title: string;
  description: string;
  /** Área de TI name, or null for "Várias áreas". */
  areaName: string | null;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  questionIds: string[];
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
