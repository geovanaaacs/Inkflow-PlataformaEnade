import { daysAgoIso } from "@/shared/utils/dates";

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

export const mockExams: MockExam[] = [
  {
    id: "simulado-programacao",
    title: "Programação e Engenharia de Software",
    description:
      "Estruturas de controle, orientação a objetos, exceções, padrões de projeto e busca.",
    areaName: "Engenharia de Software",
    difficulty: "médio",
    timeLimitMinutes: 20,
    questionIds: ["q2023-112", "q2024-80", "q2022-92", "q2021-15", "q2021-78"],
  },
  {
    id: "simulado-infra-dados",
    title: "Infraestrutura, Redes e Dados",
    description:
      "Normalização, SQL, protocolos HTTP, camada de transporte e sistemas operacionais.",
    areaName: null,
    difficulty: "médio",
    timeLimitMinutes: 25,
    questionIds: ["q2024-34", "q2023-58", "q2022-47", "q2023-12", "q2023-140", "q2024-51"],
  },
  {
    id: "simulado-geral",
    title: "Simulado Geral ENADE",
    description:
      "Todas as áreas em uma prova completa, com tempo reduzido para treinar sob pressão real.",
    areaName: null,
    difficulty: "difícil",
    timeLimitMinutes: 40,
    questionIds: [
      "q2023-112",
      "q2024-80",
      "q2022-92",
      "q2021-15",
      "q2024-34",
      "q2023-58",
      "q2022-47",
      "q2023-12",
      "q2023-201",
      "q2024-9",
      "q2021-78",
      "q2022-66",
      "q2023-140",
      "q2024-51",
    ],
  },
  {
    id: "simulado-relampago",
    title: "Simulado relâmpago",
    description:
      "Três questões em apenas 2 minutos. Ótimo para aquecer — e para ver a finalização automática quando o tempo acaba.",
    areaName: null,
    difficulty: "fácil",
    timeLimitMinutes: 2,
    questionIds: ["q2022-47", "q2023-58", "q2024-9"],
  },
];

/** Nicole (Premium) already finished one exam yesterday. */
export function seedAttempts(): MockExamAttempt[] {
  const startedAt = daysAgoIso(1, 20, 0);
  return [
    {
      id: "att-nicole-1",
      examId: "simulado-programacao",
      userId: "u-nicole",
      status: "finalizado",
      startedAt,
      endsAt: new Date(new Date(startedAt).getTime() + 20 * 60_000).toISOString(),
      finishedAt: daysAgoIso(1, 20, 14),
      answers: { "q2023-112": "d", "q2024-80": "c", "q2022-92": "d", "q2021-15": "a", "q2021-78": "b" },
      results: [
        { questionId: "q2023-112", selectedOptionId: "d", correctOptionId: "d", correct: true },
        { questionId: "q2024-80", selectedOptionId: "c", correctOptionId: "c", correct: true },
        { questionId: "q2022-92", selectedOptionId: "d", correctOptionId: "d", correct: true },
        { questionId: "q2021-15", selectedOptionId: "a", correctOptionId: "b", correct: false },
        { questionId: "q2021-78", selectedOptionId: "b", correctOptionId: "b", correct: true },
      ],
    },
  ];
}
