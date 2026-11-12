import { Router } from "express";
import { z } from "zod";
import { execute, query } from "../../db/pool.js";
import { currentUser, requireUser } from "../../http/session.js";
import type { PlanId } from "../../shared/plan-access.js";

/*
 * Front: src/features/plans/api.ts
 *   listPlans() → GET /api/plans
 *   subscribeToPlan(planId, payment) → POST /api/me/subscription { planId, payment? }
 *     payment = { method: "cartao", cardLast4 } | { method: "pix" }: required for paid
 *     plans and recorded in dbo.Payments (database/10_pagamentos.sql)
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

/**
 * Payment from the simulated checkout. Only the method and the last 4 card
 * digits travel: the full card number never leaves the screen.
 */
const paymentSchema = z.discriminatedUnion(
  "method",
  [
    z.object({
      method: z.literal("cartao"),
      cardLast4: z.string().regex(/^\d{4}$/, "Informe os 4 últimos dígitos do cartão."),
    }),
    z.object({ method: z.literal("pix") }),
  ],
  { message: "Forma de pagamento inválida." }
);

const subscribeSchema = z.object({
  planId: z.enum(["basico", "avancado", "premium"], { message: "Plano inválido." }),
  payment: paymentSchema.optional(),
});

/**
 * Simulated subscription: dbo.sp_AssinarPlano closes the active plan, opens the
 * new one and, for a paid plan, records the payment, all in one transaction in
 * the database (database/11_procedures_triggers.sql). Rule errors (no payment
 * for a paid plan, plan not found…) come back as 400/404 with the message.
 */
plansRouter.post("/me/subscription", requireUser("aluno"), async (req, res) => {
  const { planId, payment } = subscribeSchema.parse(req.body);
  const user = currentUser(req);
  if (user.plan === planId) {
    res.status(204).end();
    return;
  }
  await execute("dbo.sp_AssinarPlano", {
    UserId: user.id,
    PlanSlug: planId,
    Method: payment?.method ?? null,
    CardLast4: payment?.method === "cartao" ? payment.cardLast4 : null,
  });
  res.status(204).end();
});
