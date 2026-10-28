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
  | "mockExamRanking"
  | "mockExams"
  | "mentoring";

/** Lowest plan that unlocks each feature. */
export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanId> = {
  unlimitedQuestions: "avancado",
  notes: "avancado",
  fullHistory: "avancado",
  /** Ranking Geral — open to every plan. */
  ranking: "basico",
  /** Ranking dos Simulados (RANKING_SIMULADOS in the database). */
  mockExamRanking: "premium",
  mockExams: "premium",
  mentoring: "premium",
};

/**
 * Features teachers and admins get without a plan: they answer questions to
 * contribute, so they have no daily limit and can take notes.
 */
const STAFF_FEATURES: FeatureKey[] = ["unlimitedQuestions", "notes", "fullHistory"];

/** Daily question limit of the free plan (first attempts only). */
export const FREE_DAILY_QUESTION_LIMIT = 10;

export function hasFeature(plan: PlanId | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

/** Like hasFeature, but aware of the profile: students by plan, staff by role. */
export function userHasFeature(
  user: { role: string; plan: PlanId | null } | null | undefined,
  feature: FeatureKey
): boolean {
  if (!user) return false;
  if (user.role !== "aluno") return STAFF_FEATURES.includes(feature);
  return hasFeature(user.plan, feature);
}

export function requiredPlanFor(feature: FeatureKey): PlanId {
  return FEATURE_MIN_PLAN[feature];
}

/** Questions answered today (first attempts) against the plan's daily limit. */
export interface DailyUsage {
  used: number;
  /** null = ilimitado (Avançado/Premium, professores e administradores). */
  limit: number | null;
}
