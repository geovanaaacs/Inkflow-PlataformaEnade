import type { PlanId } from "@/shared/plans/plan-access";

export interface AreaPerformance {
  area: string;
  percent: number;
  questionsCount: number;
}

export const areaPerformance: AreaPerformance[] = [
  { area: "Eng. de Software", percent: 82, questionsCount: 64 },
  { area: "Banco de Dados", percent: 75, questionsCount: 48 },
  { area: "Redes", percent: 61, questionsCount: 39 },
  { area: "IA / ML", percent: 57, questionsCount: 28 },
  { area: "Algoritmos", percent: 43, questionsCount: 42 },
  { area: "Sist. Operacionais", percent: 38, questionsCount: 26 },
];

export interface SuggestedTopic {
  /** Area slug — "Praticar agora" opens /questoes/tema/:areaSlug. */
  areaSlug: string;
  title: string;
  level: "fácil" | "médio" | "difícil";
  percent: number;
  message: string;
}

export const suggestedTopics: SuggestedTopic[] = [
  {
    areaSlug: "algoritmos",
    title: "Algoritmos e Complexidade",
    level: "difícil",
    percent: 43,
    message: "Precisa melhorar!",
  },
  {
    areaSlug: "sistemas-operacionais",
    title: "Sistemas Operacionais",
    level: "médio",
    percent: 38,
    message: "Precisa melhorar!",
  },
  {
    areaSlug: "redes",
    title: "Redes de Computadores",
    level: "médio",
    percent: 61,
    message: "Quase lá!",
  },
  {
    areaSlug: "ia",
    title: "Inteligência Artificial",
    level: "difícil",
    percent: 57,
    message: "Quase lá!",
  },
  {
    areaSlug: "banco-de-dados",
    title: "Banco de Dados",
    level: "médio",
    percent: 75,
    message: "Bom desempenho!",
  },
  {
    areaSlug: "engenharia-de-software",
    title: "Engenharia de Software",
    level: "médio",
    percent: 82,
    message: "Ponto forte!",
  },
];

/* ------------------------------------------------------------------ Ranking */

/**
 * Ranking Geral rule (shown on screen): every question answered in the
 * Questões tab scores — a correct answer is worth more than a wrong one.
 * Only the first attempt of each question counts; mock exams don't.
 */
export const PRACTICE_POINTS = { correct: 10, wrong: 2 } as const;

/** Ranking dos Simulados rule: correct answers of the best attempt of each exam. */
export const MOCK_EXAM_POINTS_PER_CORRECT = 10;

export interface PracticeStats {
  answered: number;
  correct: number;
}

export interface MockExamStats {
  /** Distinct mock exams finished. */
  completed: number;
  /** Correct answers summed over the best attempt of each exam. */
  correct: number;
  /** Questions summed over those same attempts. */
  total: number;
}

/** Other students on the platform (fictitious) — fill the rankings around the mock users. */
export interface RankingCompetitor {
  id: string;
  name: string;
  plan: PlanId;
  practice: PracticeStats;
  /** Only students who took mock exams (Premium) appear in the Ranking dos Simulados. */
  mockExams: MockExamStats | null;
}

export const rankingCompetitors: RankingCompetitor[] = [
  { id: "c-lucas", name: "Lucas Andrade", plan: "premium", practice: { answered: 150, correct: 120 }, mockExams: { completed: 3, correct: 14, total: 17 } },
  { id: "c-beatriz", name: "Beatriz Rocha", plan: "premium", practice: { answered: 140, correct: 115 }, mockExams: { completed: 2, correct: 8, total: 11 } },
  { id: "c-joao", name: "João Pedro Lima", plan: "avancado", practice: { answered: 135, correct: 105 }, mockExams: null },
  { id: "c-camila", name: "Camila Torres", plan: "premium", practice: { answered: 130, correct: 104 }, mockExams: { completed: 2, correct: 10, total: 11 } },
  { id: "c-gabriel", name: "Gabriel Martins", plan: "avancado", practice: { answered: 128, correct: 98 }, mockExams: null },
  { id: "c-larissa", name: "Larissa Mendes", plan: "premium", practice: { answered: 120, correct: 95 }, mockExams: { completed: 1, correct: 4, total: 5 } },
  { id: "c-thiago", name: "Thiago Ribeiro", plan: "basico", practice: { answered: 118, correct: 90 }, mockExams: null },
  { id: "c-ana", name: "Ana Beatriz Souza", plan: "avancado", practice: { answered: 110, correct: 86 }, mockExams: null },
  { id: "c-felipe", name: "Felipe Carvalho", plan: "premium", practice: { answered: 104, correct: 82 }, mockExams: { completed: 1, correct: 5, total: 6 } },
  { id: "c-mariana", name: "Mariana Costa", plan: "basico", practice: { answered: 100, correct: 80 }, mockExams: null },
  { id: "c-pedro", name: "Pedro Henrique Alves", plan: "avancado", practice: { answered: 96, correct: 74 }, mockExams: null },
  { id: "c-juliana", name: "Juliana Pereira", plan: "premium", practice: { answered: 90, correct: 70 }, mockExams: { completed: 1, correct: 3, total: 5 } },
  { id: "c-rodrigo", name: "Rodrigo Fernandes", plan: "basico", practice: { answered: 80, correct: 60 }, mockExams: null },
  { id: "c-isabela", name: "Isabela Gomes", plan: "premium", practice: { answered: 70, correct: 55 }, mockExams: { completed: 1, correct: 2, total: 3 } },
];

/**
 * Questions the mock users answered before the seeded history in
 * questions/data.ts (so they start mid-table). Their live score adds every
 * new first attempt on top of this, with the same PRACTICE_POINTS rule.
 */
export const basePracticeStats: Record<string, PracticeStats> = {
  "u-maria": { answered: 95, correct: 72 },
  "u-paula": { answered: 108, correct: 85 },
  "u-nicole": { answered: 125, correct: 100 },
  "u-rafael": { answered: 50, correct: 35 },
};
