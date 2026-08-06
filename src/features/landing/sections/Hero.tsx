import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import { MoveRight } from "lucide-react";
import { Sparkles } from "lucide-react";

const stats = [
  { value: "10K", label: "Questões corrigidas" },
  { value: "500+", label: "Estudantes ativos" },
  { value: "50+", label: "Tutores profissionais" },
];

export function Hero() {
  return (
      <div className="pt-6">
      <Container as="section">
        <Button to="/planos" className="w-full rounded-full" size="sm">
        <Sparkles className="size-4.5" />
        Clique aqui para escolher seu plano
        </Button>
        <div className="grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-12">
          <div>
            <h1 className="text-xl font-bold leading-tight text-ink-strong sm:text-4xl lg:text-[32px]">
              Prepare-se para o ENADE: pratique e melhore seu{" "}
              <span className="text-brand-800">desempenho</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink-muted">
              Plataforma acadêmica completa para praticar questões do ENADE,
              receber feedback profissional e aprimorar suas habilidades com
              apoio de IA e professores especializados.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Button to="/entrar?modo=cadastro" size="md" className="group flex w-[70%] items-center justify-center gap-2">
                Quero começar agora
                <MoveRight className="size-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-2xl font-bold text-brand-800 items">
                    {stat.value}
                  </dd>
                  <dd className="text-sm text-ink-muted">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div aria-hidden="true" className="relative h-56 overflow-hidden rounded-card bg-gradient-to-br sm:h-72 lg:h-80">
            <img src="/homeImage.png" alt="Foto ilustrativa" />
          </div>
        </div>

    </Container>
    </div>
  );
}
