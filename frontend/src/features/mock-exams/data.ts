export type ExamDifficulty = "fácil" | "médio" | "difícil";

export interface MockExam {
  id: string;
  title: string;
  description: string;
  /** Área de TI, or null for a general exam. */
  areaName: string | null;
  difficulty: ExamDifficulty;
  timeLimitMinutes: number;
  /** Question ids from features/questions/data.ts, in exam order. */
  questionIds: string[];
}

export type AttemptStatus = "em_andamento" | "finalizado" | "expirado";

export interface AttemptQuestionResult {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  correct: boolean;
}

export interface MockExamAttempt {
  id: string;
  examId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string;
  /** startedAt + time limit — the timer counts down to this instant. */
  endsAt: string;
  finishedAt: string | null;
  /** questionId → selected option, saved as the student answers. */
  answers: Record<string, string>;
  results: AttemptQuestionResult[] | null;
}
