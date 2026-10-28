import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { Spinner } from "@/design-system/components/Spinner";
import type { MockExam } from "@/features/mock-exams/data";
import { errorMessage } from "@/shared/api/api-error";
import { useAsync } from "@/shared/hooks/useAsync";
import { getQuestionCatalog, listAdminMockExams, listAdminQuestions } from "./api";
import { MockExamFormModal } from "./components/MockExamFormModal";

function loadPage() {
  return Promise.all([listAdminMockExams(), listAdminQuestions(), getQuestionCatalog()]);
}

/** /admin/simulados — create and edit the timed mock exams offered to Premium students. */
export function AdminMockExamsPage() {
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useAsync(loadPage, [version]);
  const [editing, setEditing] = useState<MockExam | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [exams, questions, catalog] = data ?? [[], [], null];

  function openForm(exam: MockExam | null) {
    setEditing(exam);
    setFormOpen(true);
    setFeedback(null);
  }

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-strong">Simulados</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Simulados cronometrados disponíveis para os alunos Premium.
          </p>
        </div>
        <Button leadingIcon={<Plus aria-hidden="true" className="size-4" />} onClick={() => openForm(null)}>
          Novo simulado
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-sm font-semibold text-success">
        {feedback}
      </p>

      {loading && !data ? (
        <Spinner label="Carregando simulados…" className="py-10" />
      ) : error ? (
        <p className="text-sm text-ink-muted">
          {errorMessage(error, "Não foi possível carregar os simulados.")}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => (
            <li key={exam.id}>
              <Card as="article" className="flex h-full flex-col gap-3 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{exam.areaName ?? "Várias áreas"}</Badge>
                  <Badge tone="brand">Nível {exam.difficulty}</Badge>
                </div>
                <h2 className="text-lg font-semibold text-ink-strong">{exam.title}</h2>
                <p className="text-sm text-ink-muted">{exam.description}</p>
                <p className="text-sm text-ink-strong">
                  {exam.questionIds.length} questões · {exam.timeLimitMinutes} min
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-fit"
                  onClick={() => openForm(exam)}
                  aria-label={`Editar simulado ${exam.title}`}
                >
                  Editar
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {catalog && (
        <MockExamFormModal
          open={formOpen}
          exam={editing}
          areas={catalog.areas}
          questions={questions}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            setFormOpen(false);
            setFeedback(editing ? `Simulado “${saved.title}” atualizado.` : `Simulado “${saved.title}” criado.`);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </Container>
  );
}

export default AdminMockExamsPage;
