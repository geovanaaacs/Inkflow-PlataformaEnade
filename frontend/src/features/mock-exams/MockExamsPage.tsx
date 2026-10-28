import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { hasFeature } from "@/shared/plans/plan-access";
import { listMockExams } from "./api";
import { MockExamCard } from "./components/MockExamCard";

/** /simulados — catalog of timed mock exams (Premium). */
export function MockExamsPage() {
  const { user } = useAuth();
  const unlocked = hasFeature(user?.plan, "mockExams");
  const { data: exams, loading, error } = useAsync(listMockExams, []);

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">Simulados</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Treine em condições reais de prova: tempo cronometrado, navegação livre entre as
          questões e resultado completo ao final.
        </p>
      </div>

      {!unlocked && (
        <Card>
          <LockedFeature
            feature="mockExams"
            label="Simulados com timer"
            description="Os simulados cronometrados fazem parte do plano Premium. Veja abaixo os simulados disponíveis."
          />
        </Card>
      )}

      {loading && <Spinner label="Carregando simulados…" className="py-10" />}

      {Boolean(error) && (
        <p className="text-sm text-ink-muted">
          {errorMessage(error, "Não foi possível carregar os simulados.")}
        </p>
      )}

      {exams && (
        <ul className="grid gap-6 md:grid-cols-2">
          {exams.map((exam) => (
            <li key={exam.id}>
              <MockExamCard exam={exam} locked={!unlocked} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export default MockExamsPage;
