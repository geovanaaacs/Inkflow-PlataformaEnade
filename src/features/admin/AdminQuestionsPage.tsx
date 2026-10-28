import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Badge, type BadgeTone } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { Select } from "@/design-system/components/Select";
import { Spinner } from "@/design-system/components/Spinner";
import type { Difficulty, Question } from "@/features/questions/data";
import { errorMessage } from "@/shared/api/api-error";
import { useAsync } from "@/shared/hooks/useAsync";
import { deleteQuestion, getQuestionCatalog, listAdminQuestions } from "./api";
import { QuestionFormModal } from "./components/QuestionFormModal";

const difficultyTone: Record<Difficulty, BadgeTone> = {
  fácil: "success",
  médio: "warning",
  difícil: "danger",
};

/** /admin/questoes — question bank management (list, create, edit, remove). */
export function AdminQuestionsPage() {
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Question | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const { data: catalog } = useAsync(getQuestionCatalog, [version]);
  const { data: questions, loading, error } = useAsync(
    () => listAdminQuestions({ search, areaSlug }),
    [search, areaSlug, version]
  );

  function openForm(question: Question | null) {
    setEditing(question);
    setFormOpen(true);
    setFeedback(null);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteQuestion(toDelete.id);
      setFeedback({ tone: "success", text: `Questão ${toDelete.code} removida.` });
      setVersion((current) => current + 1);
    } catch (deleteError) {
      setFeedback({ tone: "danger", text: errorMessage(deleteError) });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-strong">Questões</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Banco de questões usado na aba Questões e nos simulados.
          </p>
        </div>
        <Button leadingIcon={<Plus aria-hidden="true" className="size-4" />} onClick={() => openForm(null)}>
          Nova questão
        </Button>
      </div>

      <Card bare className="p-5 shadow-card">
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(draftSearch);
          }}
        >
          <div className="min-w-[240px] flex-1">
            <Input
              label="Buscar por código, tópico ou enunciado"
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              icon={<Search className="size-4" aria-hidden="true" />}
            />
          </div>
          <Select
            label="Área"
            className="w-56"
            value={areaSlug}
            onChange={(event) => setAreaSlug(event.target.value)}
            options={[
              { value: "", label: "Todas as áreas" },
              ...(catalog?.areas ?? []).map((area) => ({ value: area.slug, label: area.name })),
            ]}
          />
          <Button type="submit">Buscar</Button>
        </form>
      </Card>

      <p
        role="status"
        aria-live="polite"
        className={feedback?.tone === "danger" ? "text-sm text-danger" : "text-sm font-semibold text-success"}
      >
        {feedback?.text}
      </p>

      <Card as="section" aria-labelledby="questions-heading">
        <h2 id="questions-heading" className="text-lg font-semibold text-ink-strong">
          {questions ? `${questions.length} ${questions.length === 1 ? "questão" : "questões"}` : "Questões"}
        </h2>

        {loading && !questions ? (
          <Spinner label="Carregando questões…" className="py-8" />
        ) : error ? (
          <p className="mt-4 text-sm text-ink-muted">
            {errorMessage(error, "Não foi possível carregar as questões.")}
          </p>
        ) : !questions || questions.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Nenhuma questão encontrada.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">Questões do banco</caption>
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase text-ink-muted">
                  <th scope="col" className="py-2 pr-4 font-semibold">Código</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Área › Tópico</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Ano</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Dificuldade</th>
                  <th scope="col" className="py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id} className="border-b border-black/5 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-brand-800">{question.code}</td>
                    <td className="py-3 pr-4 text-ink-strong">
                      {question.area.name} › {question.topic}
                    </td>
                    <td className="py-3 pr-4 text-ink-strong">{question.year}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={difficultyTone[question.difficulty]}>{question.difficulty}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openForm(question)}
                          aria-label={`Editar questão ${question.code}`}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setToDelete(question)}
                          aria-label={`Remover questão ${question.code}`}
                        >
                          Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {catalog && (
        <QuestionFormModal
          open={formOpen}
          question={editing}
          areas={catalog.areas}
          topicsByArea={catalog.topicsByArea}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            setFormOpen(false);
            setFeedback({
              tone: "success",
              text: editing ? `Questão ${saved.code} atualizada.` : `Questão ${saved.code} criada.`,
            });
            setVersion((current) => current + 1);
          }}
        />
      )}

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={toDelete ? `Remover a questão ${toDelete.code}?` : "Remover questão?"}
        description="Ela sai do banco de questões e dos simulados em que aparece. As respostas já dadas continuam no histórico dos alunos."
      >
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth disabled={deleting} onClick={handleDelete}>
            {deleting ? "Removendo..." : "Remover"}
          </Button>
        </div>
      </Modal>
    </Container>
  );
}

export default AdminQuestionsPage;
