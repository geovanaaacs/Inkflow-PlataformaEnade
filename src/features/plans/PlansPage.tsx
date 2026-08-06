import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/design-system/components/Container";
import { PlanCard } from "./components/PlanCard";
import { plans } from "./data";

export function PlansPage() {
  return (
    <Container as="div" className="flex flex-col items-center gap-10 py-16">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold text-ink-strong">
          Conheça os planos disponíveis
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          Pratique no seu ritmo ou desafie-se com pressão real de tempo
        </p>
      </div>

      <ul className="grid w-full gap-8 lg:grid-cols-3 lg:items-center">
        {plans.map((plan) => (
          <li key={plan.id} className={plan.highlighted ? "lg:-my-4" : undefined}>
            <PlanCard plan={plan} />
          </li>
        ))}
      </ul>

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-800 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para tela inicial
      </Link>
    </Container>
  );
}

export default PlansPage;
