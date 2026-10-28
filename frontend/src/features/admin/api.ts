import { isActiveAccount, requireSessionUser } from "@/features/auth/api";
import type { AuthUser, UserRole } from "@/features/auth/auth-context";
import { mockUsers, type MockUserRecord } from "@/features/auth/data";
import type { MockExam } from "@/features/mock-exams/data";
import { mockExams as mockExamSeed } from "@/features/mock-exams/data";
import {
  areas,
  questions as questionSeed,
  type Area,
  type Difficulty,
  type Question,
} from "@/features/questions/data";
import { ApiError } from "@/shared/api/api-error";
import { COLLECTIONS } from "@/shared/api/collections";
import { createId, mockDelay, readCollection, updateCollection } from "@/shared/api/mock-store";
import type { PlanId } from "@/shared/plans/plan-access";

/*
 * Admin API (mock). Future endpoints:
 *   GET  /api/admin/users?search=&role=        PATCH  /api/admin/users/{id}  { role, plan, active }
 *   GET  /api/admin/questions?search=&area=    POST   /api/admin/questions
 *   PUT  /api/admin/questions/{id}             DELETE /api/admin/questions/{id}
 *   GET  /api/admin/mock-exams                 POST   /api/admin/mock-exams
 *   PUT  /api/admin/mock-exams/{id}
 *
 * Mock-only: reads and writes the same collections the other features use
 * (users, questions, mockExams), seeded from their data.ts files — like
 * several endpoints sharing the same database tables.
 */

function requireAdmin(): AuthUser {
  const user = requireSessionUser();
  if (user.role !== "admin") throw new ApiError("Área exclusiva da administração.", 403);
  return user;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

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

function readUsers(): MockUserRecord[] {
  return readCollection(COLLECTIONS.users, () => mockUsers);
}

function toAdminUser(record: MockUserRecord): AdminUser {
  const { id, name, email, role, plan, course } = record;
  return { id, name, email, role, plan, course, active: isActiveAccount(record) };
}

export async function listAdminUsers(filters: AdminUserFilters = {}): Promise<AdminUser[]> {
  await mockDelay();
  requireAdmin();
  const search = normalize(filters.search?.trim() ?? "");

  return readUsers()
    .filter((user) => !filters.role || filters.role === "todos" || user.role === filters.role)
    .filter(
      (user) =>
        !search || normalize(user.name).includes(search) || normalize(user.email).includes(search)
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map(toAdminUser);
}

/** Changes profile, plan or access. Students always have a plan; staff never do. */
export async function updateAdminUser(
  userId: string,
  changes: AdminUserChanges
): Promise<AdminUser> {
  await mockDelay(300);
  const admin = requireAdmin();
  const users = readUsers();
  const record = users.find((user) => user.id === userId);
  if (!record) throw new ApiError("Usuário não encontrado.", 404);

  if (userId === admin.id && (changes.active === false || (changes.role && changes.role !== "admin"))) {
    throw new ApiError("Você não pode remover o seu próprio acesso de administrador.", 409);
  }

  const role = changes.role ?? record.role;
  const wantsPlan = changes.plan !== undefined ? changes.plan : record.plan;
  const updated: MockUserRecord = {
    ...record,
    role,
    plan: role === "aluno" ? (wantsPlan ?? "basico") : null,
    active: changes.active ?? isActiveAccount(record),
  };

  const remainingAdmins = users.filter(
    (user) =>
      user.id !== userId && user.role === "admin" && isActiveAccount(user)
  ).length;
  if (record.role === "admin" && (updated.role !== "admin" || !updated.active) && remainingAdmins === 0) {
    throw new ApiError("O Inkflow precisa de pelo menos um administrador ativo.", 409);
  }

  updateCollection(COLLECTIONS.users, () => mockUsers, (current) =>
    current.map((user) => (user.id === userId ? updated : user))
  );
  return toAdminUser(updated);
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

function readQuestions(): Question[] {
  return readCollection(COLLECTIONS.questions, () => questionSeed);
}

function readExams(): MockExam[] {
  return readCollection(COLLECTIONS.mockExams, () => mockExamSeed);
}

export async function listAdminQuestions(
  filters: { search?: string; areaSlug?: string } = {}
): Promise<Question[]> {
  await mockDelay();
  requireAdmin();
  const search = normalize(filters.search?.trim() ?? "");
  return readQuestions()
    .filter((question) => !filters.areaSlug || question.area.slug === filters.areaSlug)
    .filter(
      (question) =>
        !search ||
        [question.code, question.topic, question.statement].some((field) =>
          normalize(field).includes(search)
        )
    )
    .sort((a, b) => b.year - a.year || a.code.localeCompare(b.code));
}

/** Areas plus the topics already used in each one (suggestions for the form). */
export async function getQuestionCatalog(): Promise<{ areas: Area[]; topicsByArea: Record<string, string[]> }> {
  requireAdmin();
  const topicsByArea: Record<string, string[]> = {};
  for (const question of readQuestions()) {
    const topics = (topicsByArea[question.area.slug] ??= []);
    if (!topics.includes(question.topic)) topics.push(question.topic);
  }
  return { areas, topicsByArea };
}

function validateQuestion(input: QuestionInput, currentId: string | null): Question {
  const code = input.code.trim().toUpperCase();
  const area = areas.find((item) => item.slug === input.areaSlug);
  const options = input.options.map((option) => option.trim());
  const maxYear = new Date().getFullYear() + 1;

  if (!/^Q\d{4}-\d+$/.test(code)) throw new ApiError("Use o código no formato Q2024-15.", 400);
  if (readQuestions().some((question) => question.code === code && question.id !== currentId)) {
    throw new ApiError(`Já existe uma questão com o código ${code}.`, 409);
  }
  if (!area) throw new ApiError("Escolha a área da questão.", 400);
  if (!input.topic.trim()) throw new ApiError("Informe o tópico da questão.", 400);
  if (!Number.isInteger(input.year) || input.year < 2004 || input.year > maxYear) {
    throw new ApiError(`O ano deve estar entre 2004 e ${maxYear}.`, 400);
  }
  if (!input.statement.trim()) throw new ApiError("Escreva o enunciado da questão.", 400);
  if (options.length !== OPTION_IDS.length || options.some((option) => !option)) {
    throw new ApiError("Preencha as cinco alternativas (A a E).", 400);
  }
  if (!OPTION_IDS.includes(input.correctOptionId as (typeof OPTION_IDS)[number])) {
    throw new ApiError("Marque qual alternativa é a correta.", 400);
  }

  const existing = currentId ? readQuestions().find((question) => question.id === currentId) : null;
  return {
    id: existing?.id ?? code.toLowerCase(),
    code,
    area,
    topic: input.topic.trim(),
    year: input.year,
    type: "Múltipla escolha",
    difficulty: input.difficulty,
    statement: input.statement.trim(),
    options: options.map((label, index) => ({ id: OPTION_IDS[index], label })),
    correctOptionId: input.correctOptionId,
    aiExplanation: input.aiExplanation.trim(),
    // Teacher comment and community stay as they were (not edited by the admin).
    teacher: existing?.teacher ?? { name: "", credentials: "", comment: "" },
    community: existing?.community ?? [],
  };
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  await mockDelay(300);
  requireAdmin();
  const question = validateQuestion(input, null);
  if (readQuestions().some((item) => item.id === question.id)) {
    throw new ApiError(`Já existe uma questão com o código ${question.code}.`, 409);
  }
  updateCollection(COLLECTIONS.questions, () => questionSeed, (current) => [...current, question]);
  return question;
}

export async function updateQuestion(questionId: string, input: QuestionInput): Promise<Question> {
  await mockDelay(300);
  requireAdmin();
  if (!readQuestions().some((question) => question.id === questionId)) {
    throw new ApiError("Questão não encontrada.", 404);
  }
  const question = validateQuestion(input, questionId);
  updateCollection(COLLECTIONS.questions, () => questionSeed, (current) =>
    current.map((item) => (item.id === questionId ? question : item))
  );
  return question;
}

/**
 * Removes a question from the bank and from every mock exam. Answers already
 * given stay in the students' history (the real backend should deactivate
 * answered questions instead of deleting them — Questions.IsActive).
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  await mockDelay(300);
  requireAdmin();
  if (!readQuestions().some((question) => question.id === questionId)) {
    throw new ApiError("Questão não encontrada.", 404);
  }
  updateCollection(COLLECTIONS.questions, () => questionSeed, (current) =>
    current.filter((question) => question.id !== questionId)
  );
  updateCollection(COLLECTIONS.mockExams, () => mockExamSeed, (current) =>
    current.map((exam) => ({
      ...exam,
      questionIds: exam.questionIds.filter((id) => id !== questionId),
    }))
  );
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

export async function listAdminMockExams(): Promise<MockExam[]> {
  await mockDelay();
  requireAdmin();
  return readExams();
}

function validateExam(input: MockExamInput, id: string): MockExam {
  const title = input.title.trim();
  const questionIds = new Set(readQuestions().map((question) => question.id));

  if (!title) throw new ApiError("Informe o título do simulado.", 400);
  if (!Number.isInteger(input.timeLimitMinutes) || input.timeLimitMinutes < 1 || input.timeLimitMinutes > 240) {
    throw new ApiError("O tempo deve ser entre 1 e 240 minutos.", 400);
  }
  if (input.questionIds.length === 0) throw new ApiError("Escolha pelo menos uma questão.", 400);
  if (input.questionIds.some((questionId) => !questionIds.has(questionId))) {
    throw new ApiError("Uma das questões escolhidas não existe mais.", 400);
  }

  return {
    id,
    title,
    description: input.description.trim(),
    areaName: input.areaName,
    difficulty: input.difficulty,
    timeLimitMinutes: input.timeLimitMinutes,
    questionIds: input.questionIds,
  };
}

export async function createMockExam(input: MockExamInput): Promise<MockExam> {
  await mockDelay(300);
  requireAdmin();
  const exam = validateExam(input, createId("simulado"));
  updateCollection(COLLECTIONS.mockExams, () => mockExamSeed, (current) => [...current, exam]);
  return exam;
}

export async function updateMockExam(examId: string, input: MockExamInput): Promise<MockExam> {
  await mockDelay(300);
  requireAdmin();
  if (!readExams().some((exam) => exam.id === examId)) {
    throw new ApiError("Simulado não encontrado.", 404);
  }
  const exam = validateExam(input, examId);
  updateCollection(COLLECTIONS.mockExams, () => mockExamSeed, (current) =>
    current.map((item) => (item.id === examId ? exam : item))
  );
  return exam;
}
