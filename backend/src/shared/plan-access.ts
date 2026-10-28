/*
 * Feature rules shared with the front (src/shared/plans/plan-access.ts there).
 * Students get features from their plan — read from the database tables
 * Features/PlanFeatures — while teachers and admins get them from their role.
 */

export type UserRole = "aluno" | "professor" | "admin";
export type PlanId = "basico" | "avancado" | "premium";

export type FeatureKey =
  | "unlimitedQuestions"
  | "notes"
  | "fullHistory"
  | "ranking"
  | "mockExamRanking"
  | "mockExams"
  | "mentoring";

/** Front feature key → `Features.Code` in the database. */
export const FEATURE_CODE: Record<FeatureKey, string> = {
  unlimitedQuestions: "QUESTOES_ILIMITADAS",
  notes: "ANOTACOES",
  fullHistory: "HISTORICO_COMPLETO",
  ranking: "RANKING",
  mockExamRanking: "RANKING_SIMULADOS",
  mockExams: "SIMULADOS",
  mentoring: "MENTORIA",
};

/** Teachers and admins answer questions to contribute: no daily limit, notes allowed. */
const STAFF_FEATURES: FeatureKey[] = ["unlimitedQuestions", "notes", "fullHistory"];

export interface FeatureHolder {
  role: UserRole;
  /** Feature codes of the student's active plan (empty for staff). */
  featureCodes: string[];
}

export function userHasFeature(user: FeatureHolder, feature: FeatureKey): boolean {
  if (user.role !== "aluno") return STAFF_FEATURES.includes(feature);
  return user.featureCodes.includes(FEATURE_CODE[feature]);
}
