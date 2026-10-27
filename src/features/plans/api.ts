import { updateSessionUserPlan } from "@/features/auth/api";
import { mockDelay } from "@/shared/api/mock-store";
import type { PlanId } from "@/shared/plans/plan-access";
import { plans, type Plan } from "./data";

/*
 * Plans API (mock). Future endpoints:
 *   GET /api/plans · POST /api/me/subscription { planId }
 */

export async function listPlans(): Promise<Plan[]> {
  await mockDelay(150);
  return plans;
}

/** Simulated subscription: switches the logged-in student's plan, no payment involved. */
export async function subscribeToPlan(planId: PlanId): Promise<void> {
  await mockDelay(500);
  await updateSessionUserPlan(planId);
}
