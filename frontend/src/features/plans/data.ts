import type { PlanId } from "@/shared/plans/plan-access";

export type BillingPeriod = "gratuito" | "mensal";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price in BRL (0 for the free plan). */
  price: number;
  billingPeriod: BillingPeriod;
  items: string[];
  highlighted?: boolean;
}
