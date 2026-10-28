import {
  BarChart3,
  MessagesSquare,
  PenLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Container } from "@/design-system/components/Container";
import { FeatureCard } from "@/design-system/components/FeatureCard";

const tools = [
  {
    icon: <PenLine className="size-[18px]" />,
    title: "Questões atualizadas",
    description:
      "Nesta plataforma você encontrará todas as questões para treinar para sua prova.",
  },
  {
    icon: <Sparkles className="size-[18px]" />,
    title: "Correção por IA",
    description: "Feedback instantâneo com análise detalhada da questão feita.",
  },
  {
    icon: <BarChart3 className="size-[18px]" />,
    title: "Análise de Progresso",
    description:
      "Acompanhe sua evolução com gráficos e métricas personalizadas.",
  },
  {
    icon: <Trophy className="size-[18px]" />,
    title: "Sistema de Poções",
    description:
      "Acumule 100 poções e troque por um bate-papo com especialista.",
  },
  {
    icon: <Target className="size-[18px]" />,
    title: "Simulados reais",
    description:
      "Teste seus conhecimentos em condições similares ao dia da prova.",
  },
  {
    icon: <MessagesSquare className="size-[18px]" />,
    title: "Comentários de Profissionais",
    description: "Receba ajuda de professores que atuam diretamente na área.",
  },
];

export function ToolsGrid() {
  return (
    <Container as="section" aria-labelledby="tools-heading" className="pt-8 pb-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="tools-heading" className="text-3xl font-bold text-ink-strong">
          Ferramentas acadêmicas para excêlência
        </h2>
        <p className="mt-2 text-base text-ink-muted">
          Tudo o que você precisa para desenvolver suas habilidades em um só
          lugar.
        </p>
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <li key={tool.title}>
            <FeatureCard {...tool} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
