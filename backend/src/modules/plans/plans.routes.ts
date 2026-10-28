import { Router } from "express";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";
import { currentUser, requireUser } from "../../http/session.js";
import type { PlanId } from "../../shared/plan-access.js";

/*
 * Front: src/features/plans/api.ts
 *   listPlans() → GET /api/plans
 *   subscribeToPlan(planId) → POST /api/me/subscription { planId }
 */

interface PlanRow {
  Id: number;
  Slug: PlanId;
  Name: string;
  Description: string;
  Price: number;
  BillingPeriod: "gratuito" | "mensal";
  IsHighlighted: boolean;
}

export const plansRouter = Router();

plansRouter.get("/plans", async (_req, res) => {
  const [plans, benefits] = await Promise.all([
    query<PlanRow>(
      `SELECT Id, Slug, Name, Description, Price, BillingPeriod, IsHighlighted
       FROM dbo.Plans WHERE IsActive = 1 ORDER BY DisplayOrder`
    ),
    query<{ PlanId: number; Description: string }>(
      `SELECT PlanId, Description FROM dbo.PlanBenefits ORDER BY PlanId, DisplayOrder`
    ),
  ]);

  res.json(
    plans.map((plan) => ({
      id: plan.Slug,
      name: plan.Name,
      description: plan.Description,
      price: Number(plan.Price),
      billingPeriod: plan.BillingPeriod,
      items: benefits.filter((benefit) => benefit.PlanId === plan.Id).map((benefit) => benefit.Description),
      highlighted: plan.IsHighlighted,
    }))
  );
});

const subscribeSchema = z.object({
  planId: z.enum(["basico", "avancado", "premium"], { message: "Plano inválido." }),
});

/** Simulated subscription (no payment yet): closes the active one and opens the new one. */
plansRouter.post("/me/subscription", requireUser("aluno"), async (req, res) => {
  const { planId } = subscribeSchema.parse(req.body);
  const user = currentUser(req);
  const plan = await queryOne<{ Id: number; Price: number }>(
    `SELECT Id, Price FROM dbo.Plans WHERE Slug = @planId AND IsActive = 1`,
    { planId }
  );
  if (!plan) throw new HttpError(404, "Plano não encontrado.");
  if (user.plan === planId) {
    res.status(204).end();
    return;
  }

  await withTransaction(async (run) => {
    await run(
      `UPDATE dbo.Subscriptions
       SET Status = N'cancelada', CanceledAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE UserId = @userId AND Status = N'ativa'`,
      { userId: user.id }
    );
    await run(
      `INSERT INTO dbo.Subscriptions (UserId, PlanId, Status, Price) VALUES (@userId, @planDbId, N'ativa', @price)`,
      { userId: user.id, planDbId: plan.Id, price: plan.Price }
    );
  });
  res.status(204).end();
});
