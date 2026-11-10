import { http } from "../../lib/http";
import type { PlanId } from "../auth/api";
import type { PaymentPayload } from "./payment";

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

/** Paid plans need the payment from the simulated checkout, which the API records. */
export function subscribeToPlan(planId: PlanId, payment?: PaymentPayload): Promise<void> {
  return http.post("/me/subscription", { planId, payment });
}
