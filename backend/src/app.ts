import cookieParser from "cookie-parser";
import express from "express";
import { query } from "./db/pool.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { plansRouter } from "./modules/plans/plans.routes.js";
import { questionsRouter } from "./modules/questions/questions.routes.js";

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

  app.use("/api", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
