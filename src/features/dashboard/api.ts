import { listUsers, requireSessionUser } from "@/features/auth/api";
import {
  countQuestionsByArea,
  getDailyUsage,
  isStudentAnswer,
  listAllAnswers,
  listMyRecentAnswers,
  type AnswerSummary,
} from "@/features/questions/api";
import { listAllFinishedAttempts } from "@/features/mock-exams/api";
import { ApiError } from "@/shared/api/api-error";
import { mockDelay } from "@/shared/api/mock-store";
import { hasFeature, type DailyUsage } from "@/shared/plans/plan-access";
import {
  MOCK_EXAM_POINTS_PER_CORRECT,
  PRACTICE_POINTS,
  areaPerformance,
  basePracticeStats,
  rankingCompetitors,
  suggestedTopics,
  type AreaPerformance,
  type MockExamStats,
  type PracticeStats,
  type SuggestedTopic,
} from "./data";

/*
 * Dashboard API (mock). Future endpoints:
 *   GET /api/dashboard · GET /api/ranking?scope=geral|simulados
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

const TOP_SIZE = 5;

interface Participant {
  id: string;
  name: string;
  points: number;
  /** Tie-break: higher accuracy first. */
  accuracy: number;
  detail: string;
}

export function practicePoints({ answered, correct }: PracticeStats): number {
  return correct * PRACTICE_POINTS.correct + (answered - correct) * PRACTICE_POINTS.wrong;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function practiceParticipant(id: string, name: string, stats: PracticeStats): Participant {
  return {
    id,
    name,
    points: practicePoints(stats),
    accuracy: stats.answered ? stats.correct / stats.answered : 0,
    detail: `${plural(stats.answered, "questão", "questões")} · ${plural(stats.correct, "acerto", "acertos")}`,
  };
}

function mockExamParticipant(id: string, name: string, stats: MockExamStats): Participant {
  const accuracy = stats.total ? stats.correct / stats.total : 0;
  return {
    id,
    name,
    points: stats.correct * MOCK_EXAM_POINTS_PER_CORRECT,
    accuracy,
    detail: `${plural(stats.completed, "simulado", "simulados")} · ${Math.round(accuracy * 100)}% de acerto`,
  };
}

async function practiceParticipants(): Promise<Participant[]> {
  const [users, answers] = await Promise.all([listUsers(), listAllAnswers()]);
  const students = users.filter((user) => user.role === "aluno");

  const live = new Map<string, PracticeStats>();
  for (const answer of answers) {
    // Questões tab only: first attempt of each question, answered as a student.
    if (answer.attemptNumber !== 1 || answer.mockExamAttemptId || !isStudentAnswer(answer)) continue;
    const stats = live.get(answer.userId) ?? { answered: 0, correct: 0 };
    stats.answered += 1;
    if (answer.correct) stats.correct += 1;
    live.set(answer.userId, stats);
  }

  return [
    ...rankingCompetitors.map((competitor) =>
      practiceParticipant(competitor.id, competitor.name, competitor.practice)
    ),
    ...students.map((student) => {
      const base = basePracticeStats[student.id] ?? { answered: 0, correct: 0 };
      const extra = live.get(student.id) ?? { answered: 0, correct: 0 };
      return practiceParticipant(student.id, student.name, {
        answered: base.answered + extra.answered,
        correct: base.correct + extra.correct,
      });
    }),
  ];
}

async function mockExamParticipants(): Promise<Participant[]> {
  const [users, attempts] = await Promise.all([listUsers(), listAllFinishedAttempts()]);
  const students = new Map(
    users.filter((user) => user.role === "aluno").map((user) => [user.id, user])
  );

  // Best attempt of each exam per student.
  const best = new Map<string, Map<string, { correct: number; total: number }>>();
  for (const attempt of attempts) {
    if (!students.has(attempt.userId)) continue;
    const byExam = best.get(attempt.userId) ?? new Map();
    const current = byExam.get(attempt.examId);
    if (!current || attempt.correct > current.correct) {
      byExam.set(attempt.examId, { correct: attempt.correct, total: attempt.total });
    }
    best.set(attempt.userId, byExam);
  }

  return [
    ...rankingCompetitors.flatMap((competitor) =>
      competitor.mockExams
        ? [mockExamParticipant(competitor.id, competitor.name, competitor.mockExams)]
        : []
    ),
    ...Array.from(best.entries()).map(([userId, byExam]) => {
      const results = Array.from(byExam.values());
      return mockExamParticipant(userId, students.get(userId)?.name ?? "", {
        completed: results.length,
        correct: results.reduce((sum, result) => sum + result.correct, 0),
        total: results.reduce((sum, result) => sum + result.total, 0),
      });
    }),
  ];
}

export async function getRanking(scope: RankingScope): Promise<Ranking> {
  await mockDelay();
  const me = requireSessionUser();
  const feature = scope === "simulados" ? "mockExamRanking" : "ranking";
  if (me.role === "aluno" && !hasFeature(me.plan, feature)) {
    throw new ApiError("O Ranking dos Simulados faz parte do plano Premium.", 403);
  }

  const participants =
    scope === "simulados" ? await mockExamParticipants() : await practiceParticipants();

  const ranked = participants
    .sort(
      (a, b) =>
        b.points - a.points || b.accuracy - a.accuracy || a.name.localeCompare(b.name, "pt-BR")
    )
    .map<RankingEntry>((participant, index) => ({
      id: participant.id,
      position: index + 1,
      name: participant.name,
      points: participant.points,
      detail: participant.detail,
      isCurrentUser: participant.id === me.id,
    }));

  return {
    scope,
    top: ranked.slice(0, TOP_SIZE),
    currentUser: ranked.find((entry) => entry.isCurrentUser) ?? null,
    totalParticipants: ranked.length,
  };
}
