import { Router, type Request } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { currentUser, requireUser } from "../../http/session.js";
import { userHasFeature } from "../../shared/plan-access.js";
import type { SessionUser } from "../auth/users.repository.js";
import { listQuestionsByIds } from "../questions/questions.repository.js";
import {
  finishAttempt,
  findExam,
  getActiveAttempt,
  getAttempt,
  listSummaries,
  saveAnswer,
  startAttempt,
} from "./mock-exams.repository.js";

/*
 * Front: src/features/mock-exams/api.ts
 *   listMockExams()                    → GET  /api/mock-exams
 *   getMockExam(examId)                → GET  /api/mock-exams/:id
 *   getActiveAttempt(examId)           → GET  /api/mock-exams/:id/active-attempt  (null = nenhuma)
 *   startAttempt(examId)               → POST /api/mock-exams/:id/attempts
 *   saveAttemptAnswer(id, q, option)   → PUT  /api/mock-exam-attempts/:id/answers/:questionId  { selectedOptionId }
 *   finishAttempt(id)                  → POST /api/mock-exam-attempts/:id/finish
 *   getAttemptDetails(id)              → GET  /api/mock-exam-attempts/:id
 */

const idSchema = z.coerce.number({ message: "Identificador inválido." }).int().positive("Identificador inválido.");
const answerSchema = z.object({
  selectedOptionId: z.string().regex(/^[a-e]$/, "Alternativa inválida para esta questão."),
});

/** Catalog is visible to every student; taking an exam requires Premium. */
function premiumUser(req: Request): SessionUser {
  const user = currentUser(req);
  if (!userHasFeature(user, "mockExams")) {
    throw new HttpError(403, "Os simulados fazem parte do plano Premium.");
  }
  return user;
}

export const mockExamsRouter = Router();
const student = requireUser("aluno");

mockExamsRouter.get("/mock-exams", student, async (req, res) => {
  const user = currentUser(req);
  res.json(await listSummaries(user, userHasFeature(user, "mockExams")));
});

mockExamsRouter.get("/mock-exams/:id", student, async (req, res) => {
  premiumUser(req);
  const exam = await findExam(idSchema.parse(req.params.id));
  res.json({ exam, questions: await listQuestionsByIds(exam.questionIds.map(Number)) });
});

mockExamsRouter.get("/mock-exams/:id/active-attempt", student, async (req, res) => {
  res.json(await getActiveAttempt(premiumUser(req), idSchema.parse(req.params.id)));
});

mockExamsRouter.post("/mock-exams/:id/attempts", student, async (req, res) => {
  res.status(201).json(await startAttempt(premiumUser(req), idSchema.parse(req.params.id)));
});

mockExamsRouter.put("/mock-exam-attempts/:id/answers/:questionId", student, async (req, res) => {
  const { selectedOptionId } = answerSchema.parse(req.body);
  await saveAnswer(
    premiumUser(req),
    idSchema.parse(req.params.id),
    idSchema.parse(req.params.questionId),
    selectedOptionId
  );
  res.status(204).end();
});

mockExamsRouter.post("/mock-exam-attempts/:id/finish", student, async (req, res) => {
  res.json(await finishAttempt(premiumUser(req), idSchema.parse(req.params.id)));
});

mockExamsRouter.get("/mock-exam-attempts/:id", student, async (req, res) => {
  const { attempt, exam } = await getAttempt(premiumUser(req), idSchema.parse(req.params.id));
  res.json({ attempt, exam, questions: await listQuestionsByIds(exam.questionIds.map(Number)) });
});
