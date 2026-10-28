import type { AnswerSummary } from "@/features/questions/api";
import { http, queryString } from "@/shared/api/http";
import type { DailyUsage } from "@/shared/plans/plan-access";
import type { AreaPerformance, SuggestedTopic } from "./data";

/*
 * Dashboard API:
 *   GET /api/dashboard · GET /api/ranking?scope=geral|simulados
 */

export interface SuggestedTopicWithTotal extends SuggestedTopic {
  totalQuestions: number;
}

/** Totals of the student's first attempts (retries don't count). */
export interface StudentStats {
  answered: number;
  /** First attempts in the last 7 days (today included). */
  answeredThisWeek: number;
  /** Active questions in the bank. */
  totalQuestions: number;
  accuracyPercent: number;
  /** Consecutive days with at least one answer, ending today or yesterday. */
  streak: number;
  bestStreak: number;
}

export interface DashboardOverview {
  dailyUsage: DailyUsage;
  areaPerformance: AreaPerformance[];
  recentAnswers: AnswerSummary[];
  suggestedTopics: SuggestedTopicWithTotal[];
  stats: StudentStats;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return http.get<DashboardOverview>("/dashboard");
}

/* ------------------------------------------------------------------ Ranking */

/**
 * "geral" (every plan): points from the questions answered in the Questões
 * tab — PRACTICE_POINTS per first attempt, recalculated on each answer.
 * "simulados" (Premium): points from mock exam results — correct answers of
 * the best attempt of each exam.
 * Only students take part: teachers' and admins' answers never count.
 */
export type RankingScope = "geral" | "simulados";

export interface RankingEntry {
  id: string;
  position: number;
  name: string;
  points: number;
  /** "120 questões · 95 acertos" or "3 simulados · 82% de acerto". */
  detail: string;
  isCurrentUser: boolean;
}

export interface Ranking {
  scope: RankingScope;
  top: RankingEntry[];
  currentUser: RankingEntry | null;
  totalParticipants: number;
}

export function getRanking(scope: RankingScope): Promise<Ranking> {
  return http.get<Ranking>(`/ranking${queryString({ scope })}`);
}
