import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../../http/errors.js";
import { currentUser, requireUser } from "../../http/session.js";
import { userHasFeature } from "../../shared/plan-access.js";
import { getDailyUsage, listRecentAnswers } from "../questions/answers.repository.js";
import { getAreaStats, getStudentStats } from "./dashboard.repository.js";
import { getRanking } from "./ranking.repository.js";

/*
 * Front: src/features/dashboard/api.ts
 *   getDashboardOverview() → GET /api/dashboard
 *   getRanking(scope)      → GET /api/ranking?scope=geral|simulados
 */

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", requireUser("aluno"), async (req, res) => {
  const user = currentUser(req);
  const [dailyUsage, recentAnswers, areas, stats] = await Promise.all([
    getDailyUsage(user),
    listRecentAnswers(user, 5),
    getAreaStats(user),
    getStudentStats(user),
  ]);
  res.json({ dailyUsage, recentAnswers, ...areas, stats });
});

const rankingSchema = z.object({
  scope: z.enum(["geral", "simulados"], { message: "Ranking inválido." }).default("geral"),
});

dashboardRouter.get("/ranking", requireUser(), async (req, res) => {
  const { scope } = rankingSchema.parse(req.query);
  const user = currentUser(req);
  const feature = scope === "simulados" ? "mockExamRanking" : "ranking";
  if (user.role === "aluno" && !userHasFeature(user, feature)) {
    throw new HttpError(403, "O Ranking dos Simulados faz parte do plano Premium.");
  }
  res.json(await getRanking(scope, user.id));
});
