import cookieParser from "cookie-parser";
import express from "express";
import { query } from "./db/pool.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { mentoringRouter } from "./modules/mentoring/mentoring.routes.js";
import { mockExamsRouter } from "./modules/mock-exams/mock-exams.routes.js";
import { plansRouter } from "./modules/plans/plans.routes.js";
import { questionsRouter } from "./modules/questions/questions.routes.js";
import { teacherRouter } from "./modules/teacher/teacher.routes.js";

/**
 * Express app. Every route lives under /api; in development the front reaches
 * it through the Vite proxy (same origin, so the session cookie just works).
 */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  const api = express.Router();

  api.get("/health", async (_req, res) => {
    const [row] = await query<{ Db: string }>("SELECT DB_NAME() AS Db");
    res.json({ status: "ok", database: row?.Db ?? null });
  });

  api.use(authRouter);
  api.use(plansRouter);
  api.use(questionsRouter);
  api.use(dashboardRouter);
  api.use(mockExamsRouter);
  api.use(mentoringRouter);
  api.use(teacherRouter);
  api.use(adminRouter);

  app.use("/api", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
