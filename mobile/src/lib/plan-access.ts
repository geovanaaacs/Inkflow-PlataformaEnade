import type { PlanId, UserRole } from "../features/auth/api";

/**
 * Plan hierarchy and feature gating — same rules as
 * frontend/src/shared/plans/plan-access.ts. Each plan includes everything from
 * the plans below it: Básico (gratuito) < Avançado < Premium. The API enforces
 * them again; here they only decide what to show.
 */

export const PLAN_RANK: Record<PlanId, number> = { basico: 0, avancado: 1, premium: 2 };

export const PLAN_LABEL: Record<PlanId, string> = { basico: "Básico", avancado: "Avançado", premium: "Premium" };

export type FeatureKey =
  | "unlimitedQuestions"
  | "notes"
  | "fullHistory"
  | "ranking"
  | "mockExamRanking"
  | "mockExams"
  | "mentoring";

/** Lowest plan that unlocks each feature. */
export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanId> = {
  unlimitedQuestions: "avancado",
  notes: "avancado",
  fullHistory: "avancado",
  ranking: "basico",
  mockExamRanking: "premium",
  mockExams: "premium",
  mentoring: "premium",
};

/** Teachers and admins answer questions to contribute: no daily limit, notes allowed. */
const STAFF_FEATURES: FeatureKey[] = ["unlimitedQuestions", "notes", "fullHistory"];

export function hasFeature(plan: PlanId | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

/** Like hasFeature, but aware of the profile: students by plan, staff by role. */
export function userHasFeature(
  user: { role: UserRole; plan: PlanId | null } | null | undefined,
  feature: FeatureKey
): boolean {
  if (!user) return false;
  if (user.role !== "aluno") return STAFF_FEATURES.includes(feature);
  return hasFeature(user.plan, feature);
}

/** Questions answered today (first attempts) against the plan's daily limit. */
export interface DailyUsage {
  used: number;
  /** null = unlimited (Avançado/Premium, teachers and admins). */
  limit: number | null;
}
