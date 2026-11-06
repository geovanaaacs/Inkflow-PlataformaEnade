import { http, queryString } from "../../lib/http";
import type { DailyUsage } from "../../lib/plan-access";
import type { Difficulty } from "../questions/api";

/*
 * Dashboard API:
 *   GET /api/dashboard · GET /api/ranking?scope=geral|simulados
 */

export interface AnswerSummary {
  id: string;
  questionCode: string;
  topic: string;
  correct: boolean;
  answeredAt: string;
}

export interface AreaPerformance {
  area: string;
  percent: number;
  questionsCount: number;
}

export interface SuggestedTopic {
  areaSlug: string;
  title: string;
  level: Difficulty;
  percent: number;
  message: string;
  totalQuestions: number;
}

/** Totals of the student's first attempts (retries don't count). */
export interface StudentStats {
  answered: number;
  answeredThisWeek: number;
  totalQuestions: number;
  accuracyPercent: number;
  streak: number;
  bestStreak: number;
}

export interface DashboardOverview {
  dailyUsage: DailyUsage;
  areaPerformance: AreaPerformance[];
  recentAnswers: AnswerSummary[];
  suggestedTopics: SuggestedTopic[];
  stats: StudentStats;
}

export function getDashboardOverview(): Promise<DashboardOverview> {
  return http.get<DashboardOverview>("/dashboard");
}

export type RankingScope = "geral" | "simulados";

export interface RankingEntry {
  id: string;
  position: number;
  name: string;
  points: number;
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
