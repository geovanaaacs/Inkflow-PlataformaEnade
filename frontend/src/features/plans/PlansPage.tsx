import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { homePathFor } from "@/features/auth/role-home";
import { BackButton } from "@/shared/components/BackButton";
import { useAsync } from "@/shared/hooks/useAsync";
import { listPlans, subscribeToPlan } from "./api";
import { ConfirmPlanModal } from "./components/ConfirmPlanModal";
import { PlanCard } from "./components/PlanCard";
import type { Plan } from "./data";

export function PlansPage() {
  const { user, refreshUser } = useAuth();
  const { data: plans, loading, error, reload } = useAsync(listPlans, []);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleConfirmPlan(plan: Plan) {
    await subscribeToPlan(plan.id);
    await refreshUser();
    setSelectedPlan(null);
    setSuccessMessage(`Pronto! Agora você está no plano ${plan.name}.`);
  }

  return (
    <Container as="div" className="flex flex-col items-center gap-10 py-16">
      {user && (
        // Logged-in users get a "Voltar" to the screen that linked here.
        <div className="-mt-8 w-full">
          <BackButton fallback={homePathFor(user.role)} />
        </div>
      )}

      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold text-ink-strong">
          Conheça os planos disponíveis
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          Pratique no seu ritmo ou desafie-se com pressão real de tempo
        </p>
      </div>

      <p role="status" aria-live="polite" className="text-sm font-semibold text-success">
        {successMessage}
      </p>

      {loading && <Spinner label="Carregando planos…" />}

      {Boolean(error) && (
        <div className="flex flex-col items-center gap-3 text-sm text-ink-muted">
          Não foi possível carregar os planos.
          <Button size="sm" variant="outline" onClick={reload}>
            Tentar novamente
          </Button>
        </div>
      )}

      {plans && (
        <ul className="grid w-full gap-8 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <li key={plan.id} className={plan.highlighted ? "lg:-my-4" : undefined}>
              <PlanCard
                plan={plan}
                viewerRole={user?.role ?? null}
                currentPlanId={user?.plan}
                onSelect={(chosen) => {
                  setSuccessMessage(null);
                  setSelectedPlan(chosen);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {!user && (
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-800 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para tela inicial
        </Link>
      )}

      <ConfirmPlanModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onConfirm={handleConfirmPlan}
      />
    </Container>
  );
}

export default PlansPage;
