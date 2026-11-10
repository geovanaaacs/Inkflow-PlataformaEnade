import { http } from "@/shared/api/http";
import type { PlanId } from "@/shared/plans/plan-access";
import type { Plan } from "./data";
import type { PaymentPayload } from "./payment";

/*
 * Plans API:
 *   GET /api/plans · POST /api/me/subscription { planId, payment? }
 */

export function listPlans(): Promise<Plan[]> {
  return http.get<Plan[]>("/plans");
}

/**
 * Switches the logged-in student's plan. Paid plans need the payment from the
 * simulated checkout (method + last 4 card digits), which the API records.
 */
export function subscribeToPlan(planId: PlanId, payment?: PaymentPayload): Promise<void> {
  return http.post("/me/subscription", { planId, payment });
}
