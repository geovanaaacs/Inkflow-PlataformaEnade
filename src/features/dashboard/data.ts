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

export interface RecentAnswer {
  code: string;
  topic: string;
  when: string;
  correct: boolean;
}

export const recentAnswers: RecentAnswer[] = [
  { code: "Q2023-112", topic: "Padrões de Projeto", when: "Hoje", correct: true },
  { code: "Q2022-047", topic: "Protocolos HTTP", when: "Hoje", correct: false },
  { code: "Q2024-034", topic: "Normalização BD", when: "Hoje", correct: true },
  { code: "Q2021-078", topic: "Algoritmos de Busca", when: "Ontem", correct: false },
  { code: "Q2023-201", topic: "Redes Neurais", when: "2 dias atrás", correct: true },
];

export interface SuggestedTopic {
  id: string;
  title: string;
  level: "fácil" | "médio" | "difícil";
  totalQuestions: number;
  percent: number;
  message: string;
}

export const suggestedTopics: SuggestedTopic[] = [
  {
    id: "algoritmos",
    title: "Algorítimos e Complexidade",
    level: "difícil",
    totalQuestions: 89,
    percent: 43,
    message: "Precisa melhorar!",
  },
  {
    id: "sistemas-operacionais",
    title: "Sistemas Operacionais",
    level: "médio",
    totalQuestions: 67,
    percent: 38,
    message: "Precisa melhorar!",
  },
  {
    id: "redes",
    title: "Redes de Computadores",
    level: "médio",
    totalQuestions: 112,
    percent: 61,
    message: "Quase lá!",
  },
  {
    id: "ia",
    title: "Inteligência Artificial",
    level: "difícil",
    totalQuestions: 45,
    percent: 57,
    message: "Quase lá!",
  },
  {
    id: "banco-de-dados",
    title: "Banco de Dados",
    level: "médio",
    totalQuestions: 78,
    percent: 75,
    message: "Bom desempenho!",
  },
  {
    id: "redes-2",
    title: "Redes de Computadores",
    level: "médio",
    totalQuestions: 112,
    percent: 82,
    message: "Ponto forte!",
  },
];
