import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { currentUser, requireUser } from "../../http/session.js";
import { answerQuestion, getDailyUsage, listRecentAnswers } from "./answers.repository.js";
import { addNote, countMyNotes, listMyNotes, listQuestionNotes } from "./notes.repository.js";
import {
  countQuestionsByArea,
  findArea,
  findQuestionByCode,
  listFilterOptions,
  listQuestions,
} from "./questions.repository.js";

/*
 * Front: src/features/questions/api.ts
 *   listQuestions(filters)      → GET  /api/questions?keyword=&area=&year=&type=
 *   getQuestionFilterOptions()  → GET  /api/questions/filters
 *   getQuestionByCode(code)     → GET  /api/questions/by-code/:code
 *   listQuestionsByArea(slug)   → GET  /api/areas/:slug/questions
 *   countQuestionsByArea()      → GET  /api/questions/count-by-area
 *   answerQuestion(id, option)  → POST /api/questions/:id/answers  { selectedOptionId }
 *   getDailyUsage()             → GET  /api/me/daily-usage
 *   listMyRecentAnswers(limit)  → GET  /api/me/answers?limit=
 *   getMyNoteCounts()           → GET  /api/me/note-counts
 *   listQuestionNotes(id)       → GET  /api/questions/:id/notes
 *   addNote(id, content)        → POST /api/questions/:id/notes  { content }
 *   listMyNotes()               → GET  /api/me/notes
 */

/** The front sends "todas" for "no filter" (ALL_VALUE). */
const ALL_VALUE = "todas";
const optionalFilter = z
  .string()
  .trim()
  .optional()
  .transform((value) => (!value || value === ALL_VALUE ? undefined : value));

const filtersSchema = z.object({
  keyword: optionalFilter,
  area: optionalFilter,
  year: optionalFilter
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .refine((value) => value === undefined || Number.isInteger(value), "Ano inválido."),
  type: optionalFilter,
});

const questionIdSchema = z.coerce.number({ message: "Questão inválida." }).int().positive("Questão inválida.");

const answerSchema = z.object({
  selectedOptionId: z.string().regex(/^[a-e]$/, "Alternativa inválida para esta questão."),
});

const noteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Escreva sua anotação antes de salvar.")
    .max(2000, "A anotação pode ter no máximo 2000 caracteres."),
});

const recentSchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(5) });

export const questionsRouter = Router();

// Practicing questions is for students and teachers (admins manage them in /api/admin).
const practice = requireUser("aluno", "professor");

questionsRouter.get("/questions", practice, async (req, res) => {
  res.json(await listQuestions(filtersSchema.parse(req.query)));
});

questionsRouter.get("/questions/filters", practice, async (_req, res) => {
  res.json(await listFilterOptions());
});

questionsRouter.get("/questions/count-by-area", requireUser(), async (_req, res) => {
  res.json(await countQuestionsByArea());
});

questionsRouter.get("/questions/by-code/:code", practice, async (req, res) => {
  const code = String(req.params.code);
  const question = await findQuestionByCode(code);
  if (!question) throw new HttpError(404, `A questão ${code} não foi encontrada.`);
  res.json(question);
});

questionsRouter.get("/areas/:slug/questions", practice, async (req, res) => {
  const area = await findArea(String(req.params.slug));
  if (!area) throw new HttpError(404, "Tema não encontrado.");
  res.json({ area, questions: await listQuestions({ area: area.slug }) });
});

questionsRouter.post("/questions/:id/answers", practice, async (req, res) => {
  const questionId = questionIdSchema.parse(req.params.id);
  const { selectedOptionId } = answerSchema.parse(req.body);
  res.status(201).json(await answerQuestion(currentUser(req), questionId, selectedOptionId));
});

questionsRouter.get("/questions/:id/notes", practice, async (req, res) => {
  res.json(await listQuestionNotes(currentUser(req), questionIdSchema.parse(req.params.id)));
});

questionsRouter.post("/questions/:id/notes", practice, async (req, res) => {
  const questionId = questionIdSchema.parse(req.params.id);
  const { content } = noteSchema.parse(req.body);
  res.status(201).json(await addNote(currentUser(req), questionId, content));
});

questionsRouter.get("/me/daily-usage", practice, async (req, res) => {
  res.json(await getDailyUsage(currentUser(req)));
});

questionsRouter.get("/me/answers", practice, async (req, res) => {
  const { limit } = recentSchema.parse(req.query);
  res.json(await listRecentAnswers(currentUser(req), limit));
});

questionsRouter.get("/me/note-counts", practice, async (req, res) => {
  res.json(await countMyNotes(currentUser(req)));
});

questionsRouter.get("/me/notes", practice, async (req, res) => {
  res.json(await listMyNotes(currentUser(req)));
});
