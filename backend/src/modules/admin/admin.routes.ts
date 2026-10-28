import { Router } from "express";
import { z } from "zod";
import { currentUser, requireUser } from "../../http/session.js";
import { listExams } from "../mock-exams/mock-exams.repository.js";
import { listQuestions } from "../questions/questions.repository.js";
import {
  deactivateQuestion,
  getQuestionCatalog,
  listUsers,
  saveMockExam,
  saveQuestion,
  updateUser,
} from "./admin.repository.js";

/*
 * Front: src/features/admin/api.ts (only the "admin" profile)
 *   listAdminUsers(filters)       → GET    /api/admin/users?search=&role=
 *   updateAdminUser(id, changes)  → PATCH  /api/admin/users/:id  { role?, plan?, active? }
 *   listAdminQuestions(filters)   → GET    /api/admin/questions?search=&areaSlug=
 *   getQuestionCatalog()          → GET    /api/admin/questions/catalog
 *   createQuestion(input)         → POST   /api/admin/questions
 *   updateQuestion(id, input)     → PUT    /api/admin/questions/:id
 *   deleteQuestion(id)            → DELETE /api/admin/questions/:id   (desativa)
 *   listAdminMockExams()          → GET    /api/admin/mock-exams
 *   createMockExam(input)         → POST   /api/admin/mock-exams
 *   updateMockExam(id, input)     → PUT    /api/admin/mock-exams/:id
 */

const idSchema = z.coerce.number({ message: "Identificador inválido." }).int().positive("Identificador inválido.");
const roleSchema = z.enum(["aluno", "professor", "admin"], { message: "Perfil inválido." });
const difficultySchema = z.enum(["fácil", "médio", "difícil"], { message: "Dificuldade inválida." });
const maxYear = new Date().getFullYear() + 1;

const userFiltersSchema = z.object({
  search: z.string().trim().optional().transform((value) => value || undefined),
  role: z
    .string()
    .optional()
    .transform((value) => (!value || value === "todos" ? undefined : value))
    .pipe(roleSchema.optional()),
});

const userChangesSchema = z
  .object({
    role: roleSchema.optional(),
    plan: z.enum(["basico", "avancado", "premium"], { message: "Plano inválido." }).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, "Nada para alterar.");

const questionSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^Q\d{4}-\d+$/, "Use o código no formato Q2024-15."),
  areaSlug: z.string().min(1, "Escolha a área da questão."),
  topic: z.string().trim().min(1, "Informe o tópico da questão.").max(150),
  year: z.coerce.number().int().min(2004, `O ano deve estar entre 2004 e ${maxYear}.`).max(maxYear, `O ano deve estar entre 2004 e ${maxYear}.`),
  difficulty: difficultySchema,
  statement: z.string().trim().min(1, "Escreva o enunciado da questão."),
  options: z
    .array(z.string().trim().min(1, "Preencha as cinco alternativas (A a E).").max(1000))
    .length(5, "Preencha as cinco alternativas (A a E)."),
  correctOptionId: z.enum(["a", "b", "c", "d", "e"], { message: "Marque qual alternativa é a correta." }),
  aiExplanation: z.string().trim().default(""),
});

const mockExamSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do simulado.").max(150),
  description: z.string().trim().max(1000).default(""),
  areaName: z.string().trim().nullable().default(null).transform((value) => value || null),
  difficulty: difficultySchema,
  timeLimitMinutes: z.coerce.number().int().min(1, "O tempo deve ser entre 1 e 240 minutos.").max(240, "O tempo deve ser entre 1 e 240 minutos."),
  questionIds: z.array(z.coerce.number().int().positive()).min(1, "Escolha pelo menos uma questão."),
});

const questionFiltersSchema = z.object({
  search: z.string().trim().optional().transform((value) => value || undefined),
  areaSlug: z.string().trim().optional().transform((value) => value || undefined),
});

export const adminRouter = Router();
adminRouter.use("/admin", requireUser("admin"));

adminRouter.get("/admin/users", async (req, res) => {
  res.json(await listUsers(userFiltersSchema.parse(req.query)));
});

adminRouter.patch("/admin/users/:id", async (req, res) => {
  const changes = userChangesSchema.parse(req.body);
  res.json(await updateUser(currentUser(req).id, z.guid("Usuário inválido.").parse(req.params.id), changes));
});

adminRouter.get("/admin/questions", async (req, res) => {
  const filters = questionFiltersSchema.parse(req.query);
  res.json(await listQuestions({ keyword: filters.search, area: filters.areaSlug }));
});

adminRouter.get("/admin/questions/catalog", async (_req, res) => {
  res.json(await getQuestionCatalog());
});

adminRouter.post("/admin/questions", async (req, res) => {
  res.status(201).json(await saveQuestion(null, questionSchema.parse(req.body)));
});

adminRouter.put("/admin/questions/:id", async (req, res) => {
  res.json(await saveQuestion(idSchema.parse(req.params.id), questionSchema.parse(req.body)));
});

adminRouter.delete("/admin/questions/:id", async (req, res) => {
  await deactivateQuestion(idSchema.parse(req.params.id));
  res.status(204).end();
});

adminRouter.get("/admin/mock-exams", async (_req, res) => {
  res.json(await listExams());
});

adminRouter.post("/admin/mock-exams", async (req, res) => {
  res.status(201).json(await saveMockExam(null, mockExamSchema.parse(req.body)));
});

adminRouter.put("/admin/mock-exams/:id", async (req, res) => {
  res.json(await saveMockExam(idSchema.parse(req.params.id), mockExamSchema.parse(req.body)));
});
