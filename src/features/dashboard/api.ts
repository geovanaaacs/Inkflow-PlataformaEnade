import { listUsers, requireSessionUser } from "@/features/auth/api";
import {
  countQuestionsByArea,
  getDailyUsage,
  listAllAnswers,
  listMyRecentAnswers,
  type AnswerSummary,
} from "@/features/questions/api";
import { ApiError } from "@/shared/api/api-error";
import { mockDelay } from "@/shared/api/mock-store";
import { hasFeature, type DailyUsage, type PlanId } from "@/shared/plans/plan-access";
import {
  POINTS_PER_CORRECT_ANSWER,
  areaPerformance,
  baseUserPoints,
  rankingCompetitors,
  suggestedTopics,
  type AreaPerformance,
  type SuggestedTopic,
} from "./data";

/*
 * Dashboard API (mock). Future endpoints:
 *   GET /api/dashboard · GET /api/ranking?scope=geral|premium
 */

export interface SuggestedTopicWithTotal extends SuggestedTopic {
  totalQuestions: number;
}

export interface DashboardOverview {
  dailyUsage: DailyUsage;
  areaPerformance: AreaPerformance[];
  recentAnswers: AnswerSummary[];
  suggestedTopics: SuggestedTopicWithTotal[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [dailyUsage, recentAnswers, counts] = await Promise.all([
    getDailyUsage(),
    listMyRecentAnswers(5),
    countQuestionsByArea(),
  ]);

  return {
    dailyUsage,
    areaPerformance,
    recentAnswers,
    suggestedTopics: suggestedTopics.map((topic) => ({
      ...topic,
      totalQuestions: counts[topic.areaSlug] ?? 0,
    })),
  };
}

/* ------------------------------------------------------------------ Ranking */

/**
 * "geral" (Avançado+): every student, recalculated on each answer ("tempo real").
 * "premium" (Premium): only Premium subscribers — the exclusive ranking.
 */
export type RankingScope = "geral" | "premium";

export interface RankingEntry {
  id: string;
  position: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

export interface Ranking {
  scope: RankingScope;
  top: RankingEntry[];
  currentUser: RankingEntry | null;
  totalParticipants: number;
}

const TOP_SIZE = 5;

export async function getRanking(scope: RankingScope): Promise<Ranking> {
  await mockDelay();
  const me = requireSessionUser();
  const feature = scope === "premium" ? "exclusiveRanking" : "ranking";
  if (!hasFeature(me.plan, feature)) {
    throw new ApiError("Seu plano não inclui este ranking.", 403);
  }

  const [users, answers] = await Promise.all([listUsers(), listAllAnswers()]);

  const correctByUser = new Map<string, number>();
  for (const answer of answers) {
    if (answer.attemptNumber === 1 && answer.correct) {
      correctByUser.set(answer.userId, (correctByUser.get(answer.userId) ?? 0) + 1);
    }
  }

  const participants: { id: string; name: string; plan: PlanId | null; points: number }[] = [
    ...rankingCompetitors,
    ...users
      .filter((user) => user.role === "aluno")
      .map((user) => ({
        id: user.id,
        name: user.name,
        plan: user.plan,
        points:
          (baseUserPoints[user.id] ?? 0) +
          (correctByUser.get(user.id) ?? 0) * POINTS_PER_CORRECT_ANSWER,
      })),
  ];

  const ranked = participants
    .filter((participant) => scope === "geral" || participant.plan === "premium")
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "pt-BR"))
    .map<RankingEntry>((participant, index) => ({
      id: participant.id,
      position: index + 1,
      name: participant.name,
      points: participant.points,
      isCurrentUser: participant.id === me.id,
    }));

  return {
    scope,
    top: ranked.slice(0, TOP_SIZE),
    currentUser: ranked.find((entry) => entry.isCurrentUser) ?? null,
    totalParticipants: ranked.length,
  };
}
