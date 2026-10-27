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

/** Other students on the platform (fictitious) — fill the ranking around the mock users. */
export interface RankingCompetitor {
  id: string;
  name: string;
  plan: PlanId;
  points: number;
}

export const rankingCompetitors: RankingCompetitor[] = [
  { id: "c-lucas", name: "Lucas Andrade", plan: "premium", points: 1720 },
  { id: "c-beatriz", name: "Beatriz Rocha", plan: "premium", points: 1650 },
  { id: "c-joao", name: "João Pedro Lima", plan: "avancado", points: 1580 },
  { id: "c-camila", name: "Camila Torres", plan: "premium", points: 1540 },
  { id: "c-gabriel", name: "Gabriel Martins", plan: "avancado", points: 1460 },
  { id: "c-larissa", name: "Larissa Mendes", plan: "premium", points: 1410 },
  { id: "c-thiago", name: "Thiago Ribeiro", plan: "basico", points: 1350 },
  { id: "c-ana", name: "Ana Beatriz Souza", plan: "avancado", points: 1290 },
  { id: "c-felipe", name: "Felipe Carvalho", plan: "premium", points: 1240 },
  { id: "c-mariana", name: "Mariana Costa", plan: "basico", points: 1210 },
  { id: "c-pedro", name: "Pedro Henrique Alves", plan: "avancado", points: 1150 },
  { id: "c-juliana", name: "Juliana Pereira", plan: "premium", points: 1100 },
  { id: "c-rodrigo", name: "Rodrigo Fernandes", plan: "basico", points: 990 },
  { id: "c-isabela", name: "Isabela Gomes", plan: "premium", points: 930 },
];

/**
 * Points the mock users had before their seeded answer history. Their live
 * score is this plus 10 points per correct first attempt.
 */
export const baseUserPoints: Record<string, number> = {
  "u-maria": 1180,
  "u-paula": 1320,
  "u-nicole": 1490,
  "u-rafael": 640,
};

export const POINTS_PER_CORRECT_ANSWER = 10;
