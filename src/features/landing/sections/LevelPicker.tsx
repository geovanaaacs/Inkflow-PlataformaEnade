import { BookOpen, CheckCircle2, Flame, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/design-system/components/Container";
import { Card } from "@/design-system/components/Card";
import { IconBadge, type IconBadgeTone } from "@/design-system/components/IconBadge";
import { cn } from "@/design-system/utils/cn";

interface Level {
  icon: ReactNode;
  tone: IconBadgeTone;
  name: string;
  tagline: string;
  description: string;
  items: string[];
  highlighted?: boolean;
}

const levels: Level[] = [
  {
    icon: <BookOpen className="size-5" />,
    tone: "success",
    name: "Fácil",
    tagline: "Para iniciantes",
    description:
      "Ideal para iniciantes. Questões simples com tempo generoso para praticar os fundamentos.",
    items: [
      "Caderno de questões limitado",
      "Sem limite de tempo",
      "Feedback a cada questão respondida",
    ],
  },
  {
    icon: <Zap className="size-5" />,
    tone: "warning",
    name: "Médio",
    tagline: "Questões mais avançadas",
    description:
      "Para quem já domina o básico. Questões mais complexas ainda com tempo para estudar fundamentos.",
    items: [
      "Caderno de questões mais avançadas",
      "Sem limite de tempo",
      "Feedback ao finalizar o caderno",
    ],
  },
  {
    icon: <Flame className="size-5" />,
    tone: "danger",
    name: "Difícil",
    tagline: "Simulado fiel ao ENADE",
    description:
      "Simula condições reais de prova. Pressão de tempo e questões desafiadoras.",
    items: [
      "Simulado com questões avançadas",
      "Habilitar limite de tempo",
      "Análise de performance",
    ],
    highlighted: true,
  },
];

export function LevelPicker() {
  return (
    <Container as="section" aria-labelledby="levels-heading" className="py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="levels-heading" className="text-3xl font-bold text-ink-strong">
          Escolha seu nível
        </h2>
        <p className="mt-2 text-base text-ink-muted">
          Pratique no seu ritmo ou desafie-se com pressão real de tempo
        </p>
      </div>
      <ul className="mt-10 grid gap-6 lg:grid-cols-3">
        {levels.map((level) => (
          <li key={level.name} className="relative">
            {level.highlighted && (
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-badge bg-brand-900 px-4 py-1 text-xs font-semibold text-white">
                Plano Premium
              </span>
            )}
            <Card
              className={cn(
                "flex h-full flex-col gap-4",
                level.highlighted && "border-2 border-brand-600"
              )}
            >
              <div className="flex items-center gap-3">
                <IconBadge icon={level.icon} tone={level.tone} />
                <div>
                  <h3 className="text-base font-semibold text-ink-strong">
                    {level.name}
                  </h3>
                  <p className="text-sm font-medium text-ink-muted">
                    {level.tagline}
                  </p>
                </div>
              </div>
              <p className="text-sm text-ink-muted">{level.description}</p>
              <ul className="mt-auto flex flex-col gap-2 pt-2">
                {level.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-strong">
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-success"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
    </Container>
  );
}
