import { Router, type Request } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { currentUser, requireUser } from "../../http/session.js";
import { userHasFeature } from "../../shared/plan-access.js";
import type { SessionUser } from "../auth/users.repository.js";
import {
  cancelMyRequest,
  cancelSlot,
  createSlot,
  listMyRequests,
  listOpenSlots,
  listTeacherRequests,
  listTeacherSlots,
  requestSlot,
  respondToRequest,
} from "./mentoring.repository.js";

/*
 * Front: src/features/mentoring/api.ts
 *   aluno (Premium)
 *     listOpenSlots(type)        → GET    /api/mentoring/slots?type=mentoria|grupo
 *     requestSlot(id, message)   → POST   /api/mentoring/slots/:id/requests  { message }
 *     listMyRequests()           → GET    /api/me/mentoring-requests
 *     cancelMyRequest(id)        → POST   /api/me/mentoring-requests/:id/cancel
 *   professor
 *     listTeacherSlots()         → GET    /api/teacher/slots
 *     createSlot(input)          → POST   /api/teacher/slots
 *     deleteSlot(id)             → DELETE /api/teacher/slots/:id   (cancelamento lógico)
 *     listTeacherRequests()      → GET    /api/teacher/mentoring-requests
 *     respondToRequest(id, d)    → POST   /api/teacher/mentoring-requests/:id/accept | /decline
 */

const idSchema = z.coerce.number({ message: "Identificador inválido." }).int().positive("Identificador inválido.");
const typeSchema = z.object({
  type: z.enum(["mentoria", "grupo"], { message: "Tipo de encontro inválido." }),
});
const requestSchema = z.object({
  message: z.string().trim().max(500, "A mensagem pode ter no máximo 500 caracteres.").default(""),
});
const newSlotSchema = z.object({
  type: z.enum(["mentoria", "grupo"], { message: "Tipo de encontro inválido." }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  durationMinutes: z.coerce.number().int().min(15, "Duração mínima de 15 minutos.").max(240, "Duração máxima de 4 horas."),
  capacity: z.coerce.number().int().min(1, "O número de vagas deve ser entre 1 e 100.").max(100, "O número de vagas deve ser entre 1 e 100."),
  topic: z.string().trim().min(1, "Informe o tema do encontro.").max(120, "O tema pode ter no máximo 120 caracteres."),
});

function premiumStudent(req: Request): SessionUser {
  const user = currentUser(req);
  if (!userHasFeature(user, "mentoring")) {
    throw new HttpError(403, "Mentoria e grupos de estudo fazem parte do plano Premium.");
  }
  return user;
}

export const mentoringRouter = Router();
const student = requireUser("aluno");
const teacher = requireUser("professor");

mentoringRouter.get("/mentoring/slots", student, async (req, res) => {
  const { type } = typeSchema.parse(req.query);
  res.json(await listOpenSlots(premiumStudent(req), type));
});

mentoringRouter.post("/mentoring/slots/:id/requests", student, async (req, res) => {
  const { message } = requestSchema.parse(req.body ?? {});
  res.status(201).json(await requestSlot(premiumStudent(req), idSchema.parse(req.params.id), message));
});

mentoringRouter.get("/me/mentoring-requests", student, async (req, res) => {
  res.json(await listMyRequests(premiumStudent(req)));
});

mentoringRouter.post("/me/mentoring-requests/:id/cancel", student, async (req, res) => {
  await cancelMyRequest(premiumStudent(req), idSchema.parse(req.params.id));
  res.status(204).end();
});

mentoringRouter.get("/teacher/slots", teacher, async (req, res) => {
  res.json(await listTeacherSlots(currentUser(req)));
});

mentoringRouter.post("/teacher/slots", teacher, async (req, res) => {
  res.status(201).json(await createSlot(currentUser(req), newSlotSchema.parse(req.body)));
});

mentoringRouter.delete("/teacher/slots/:id", teacher, async (req, res) => {
  await cancelSlot(currentUser(req), idSchema.parse(req.params.id));
  res.status(204).end();
});

mentoringRouter.get("/teacher/mentoring-requests", teacher, async (req, res) => {
  res.json(await listTeacherRequests(currentUser(req)));
});

mentoringRouter.post("/teacher/mentoring-requests/:id/:decision", teacher, async (req, res) => {
  const decision = z.enum(["accept", "decline"], { message: "Ação inválida." }).parse(req.params.decision);
  await respondToRequest(currentUser(req), idSchema.parse(req.params.id), decision === "accept" ? "confirmada" : "recusada");
  res.status(204).end();
});
