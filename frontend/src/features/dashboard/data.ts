/** Accuracy of the student's first attempts in one area (calculated by the API). */
export interface AreaPerformance {
  area: string;
  percent: number;
  questionsCount: number;
}

export interface SuggestedTopic {
  /** Area slug — "Praticar agora" opens /questoes/tema/:areaSlug. */
  areaSlug: string;
  title: string;
  level: "fácil" | "médio" | "difícil";
  percent: number;
  message: string;
}

/* ------------------------------------------------------------------ Ranking */

/**
 * Ranking Geral rule (shown on screen): every question answered in the
 * Questões tab scores — a correct answer is worth more than a wrong one.
 * Only the first attempt of each question counts; mock exams don't.
 * Same values as the database view vw_PracticeRanking.
 */
export const PRACTICE_POINTS = { correct: 10, wrong: 2 } as const;

/** Ranking dos Simulados rule: correct answers of the best attempt of each exam. */
export const MOCK_EXAM_POINTS_PER_CORRECT = 10;
