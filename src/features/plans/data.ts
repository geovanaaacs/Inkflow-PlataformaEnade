export interface Plan {
  id: string;
  name: string;
  description: string;
  items: string[];
  highlighted?: boolean;
}

export const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    description:
      "Ideal para quem está começando e quer testar o ritmo de estudos.",
    items: [
      "Resolva questões para praticar no seu ritmo",
      "Gabaritos comentados por professores e colegas",
      "Feedback instantâneo com IA para corrigir erros na hora",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description:
      "Orientação especializada, simulados reais e comunidade para quem está comprometido com seu diploma.",
    items: [
      "Mentoria coletiva e grupo de estudo com especialista",
      "Simulado com timer para treinar em condições reais de prova",
      "Grupo exclusivo no WhatsApp: especialista define o que e a ordem para estudar",
      "Ranking exclusivo para acompanhar sua posição entre os mais preparados",
    ],
    highlighted: true,
  },
  {
    id: "avancado",
    name: "Avançado",
    description:
      "Para quem quer praticar mais e acompanhar sua evolução frente à concorrência.",
    items: [
      "Questões ilimitadas para praticar sempre que quiser",
      "Ranking em tempo real: veja sua posição frente aos concorrentes",
      "Bloco de anotações individual para organizar seus estudos",
    ],
  },
];
