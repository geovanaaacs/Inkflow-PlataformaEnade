/**
 * Plan hierarchy and feature gating. Each plan includes everything from the
 * plans below it: Básico (gratuito) < Avançado < Premium.
 *
 * Feature keys mirror the `Features` table of the database, so swapping this
 * for an API-provided list later keeps the same call sites.
 */

export type PlanId = "basico" | "avancado" | "premium";

export const PLAN_RANK: Record<PlanId, number> = {
  basico: 0,
  avancado: 1,
  premium: 2,
};

export const PLAN_LABEL: Record<PlanId, string> = {
  basico: "Básico",
  avancado: "Avançado",
  premium: "Premium",
};

export type FeatureKey =
  | "unlimitedQuestions"
  | "notes"
  | "fullHistory"
  | "ranking"
  | "exclusiveRanking"
  | "mockExams"
  | "mentoring";

/** Lowest plan that unlocks each feature. */
export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanId> = {
  unlimitedQuestions: "avancado",
  notes: "avancado",
  fullHistory: "avancado",
  ranking: "avancado",
  exclusiveRanking: "premium",
  mockExams: "premium",
  mentoring: "premium",
};

/** Daily question limit of the free plan (first attempts only). */
export const FREE_DAILY_QUESTION_LIMIT = 10;

export function hasFeature(plan: PlanId | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

export function requiredPlanFor(feature: FeatureKey): PlanId {
  return FEATURE_MIN_PLAN[feature];
}

/** Questions answered today (first attempts) against the plan's daily limit. */
export interface DailyUsage {
  used: number;
  /** null = ilimitado (Avançado/Premium). */
  limit: number | null;
}
