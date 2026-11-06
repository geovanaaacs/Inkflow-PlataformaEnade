import { http } from "../../lib/http";
import type { PlanId } from "../auth/api";

/*
 * Plans API:
 *   GET /api/plans · POST /api/me/subscription { planId }  (simulated, no payment)
 */

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price in BRL (0 for the free plan). */
  price: number;
  billingPeriod: "gratuito" | "mensal";
  items: string[];
  highlighted?: boolean;
}

export function listPlans(): Promise<Plan[]> {
  return http.get<Plan[]>("/plans");
}

export function subscribeToPlan(planId: PlanId): Promise<void> {
  return http.post("/me/subscription", { planId });
}
