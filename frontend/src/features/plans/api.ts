import { http } from "@/shared/api/http";
import type { PlanId } from "@/shared/plans/plan-access";
import type { Plan } from "./data";

/*
 * Plans API:
 *   GET /api/plans · POST /api/me/subscription { planId }
 */

export function listPlans(): Promise<Plan[]> {
  return http.get<Plan[]>("/plans");
}

/** Simulated subscription: switches the logged-in student's plan, no payment involved. */
export function subscribeToPlan(planId: PlanId): Promise<void> {
  return http.post("/me/subscription", { planId });
}
