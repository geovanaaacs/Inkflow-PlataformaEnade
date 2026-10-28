import type { PlanId } from "@/shared/plans/plan-access";

export type BillingPeriod = "gratuito" | "mensal";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price in BRL (0 for the free plan). */
  price: number;
  billingPeriod: BillingPeriod;
  items: string[];
  highlighted?: boolean;
}

/** Ordered from the entry plan to the most complete one (each includes the previous). */
export const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    description:
      "Ideal para quem está começando e quer testar o ritmo de estudos.",
    price: 0,
    billingPeriod: "gratuito",
    items: [
      "Resolva até 10 questões por dia no seu ritmo",
      "Gabaritos comentados por professores e colegas",
      "Feedback instantâneo com IA para corrigir erros na hora",
      "Ranking Geral em tempo real com as questões que você responde",
    ],
  },
  {
    id: "avancado",
    name: "Avançado",
    description:
      "Para quem quer praticar sem limites e organizar os estudos com anotações.",
    price: 14.9,
    billingPeriod: "mensal",
    items: [
      "Tudo do plano Básico",
      "Questões ilimitadas para praticar sempre que quiser",
      "Bloco de anotações individual para organizar seus estudos",
      "Histórico completo de acertos e erros",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description:
      "Orientação especializada, simulados reais e comunidade para quem está comprometido com seu diploma.",
    price: 29.9,
    billingPeriod: "mensal",
    items: [
      "Tudo do plano Avançado",
      "Mentoria coletiva e grupo de estudo com especialista",
      "Simulados com timer para treinar em condições reais de prova",
      "Grupo exclusivo no WhatsApp: especialista define o que e a ordem para estudar",
      "Acesso ao Ranking dos Simulados: acompanhe sua evolução e sua posição nos simulados",
    ],
    highlighted: true,
  },
];
