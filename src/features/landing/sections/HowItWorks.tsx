import { BookMarked, PenSquare, TrendingUp } from "lucide-react";
import { Container } from "@/design-system/components/Container";
import { Card } from "@/design-system/components/Card";
import { IconBadge } from "@/design-system/components/IconBadge";

const steps = [
  {
    number: "01",
    icon: <BookMarked className="size-5" />,
    title: "Escolha uma matéria",
    description: "Selecione a matéria desejada para o estudo.",
  },
  {
    number: "02",
    icon: <PenSquare className="size-5" />,
    title: "Responda questões",
    description: "Demonstre seus conhecimentos ao responder as questões.",
  },
  {
    number: "03",
    icon: <TrendingUp className="size-5" />,
    title: "Evolua com feedback",
    description:
      "Receba feedback detalhado e acompanhe sua evolução ao longo do tempo.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="bg-background-card py-16">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-bold text-ink-strong"
          >
            Como funciona
          </h2>
          <p className="mt-2 text-base text-ink-muted">
            Três passos simples para começar sua jornada de evolução
          </p>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="relative pt-4">
              <span
                aria-hidden="true"
                className="absolute -top-0 left-5 z-10 inline-flex h-8 min-w-10 items-center justify-center rounded-badge bg-brand-600 px-3 text-sm font-semibold text-white shadow-sm"
              >
                {step.number}
              </span>
              <Card className="flex h-full flex-col gap-3 pt-8 bg-background-mini_card">
                <IconBadge icon={step.icon} />
                <h3 className="text-base font-semibold text-ink-strong">
                  {step.title}
                </h3>
                <p className="text-base text-ink-muted">{step.description}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
