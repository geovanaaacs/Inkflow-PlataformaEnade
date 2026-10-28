import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Input, Textarea } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { Select } from "@/design-system/components/Select";
import type { MockExam } from "@/features/mock-exams/data";
import type { Area, Difficulty, Question } from "@/features/questions/data";
import { errorMessage } from "@/shared/api/api-error";
import { createMockExam, updateMockExam, type MockExamInput } from "../api";

const DIFFICULTIES: Difficulty[] = ["fácil", "médio", "difícil"];
const ALL_AREAS = "";

interface MockExamFormModalProps {
  open: boolean;
  exam: MockExam | null;
  areas: Area[];
  questions: Question[];
  onClose: () => void;
  onSaved: (exam: MockExam) => void;
}

export function MockExamFormModal({ open, exam, areas, questions, onClose, onSaved }: MockExamFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exam ? `Editar simulado` : "Novo simulado"}
      size="2xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      <MockExamForm
        key={exam?.id ?? "new"}
        exam={exam}
        areas={areas}
        questions={questions}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

interface MockExamFormProps {
  exam: MockExam | null;
  areas: Area[];
  questions: Question[];
  onCancel: () => void;
  onSaved: (exam: MockExam) => void;
}

function MockExamForm({ exam, areas, questions, onCancel, onSaved }: MockExamFormProps) {
  const [input, setInput] = useState<MockExamInput>(() => ({
    title: exam?.title ?? "",
    description: exam?.description ?? "",
    areaName: exam?.areaName ?? null,
    difficulty: exam?.difficulty ?? "médio",
    timeLimitMinutes: exam?.timeLimitMinutes ?? 30,
    questionIds: exam?.questionIds ?? [],
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MockExamInput>(key: K, value: MockExamInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  /** Keeps the exam order: questions are added at the end, removed in place. */
  function toggleQuestion(questionId: string) {
    update(
      "questionIds",
      input.questionIds.includes(questionId)
        ? input.questionIds.filter((id) => id !== questionId)
        : [...input.questionIds, questionId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = exam ? await updateMockExam(exam.id, input) : await createMockExam(input);
      onSaved(saved);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const codeById = new Map(questions.map((question) => [question.id, question.code]));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        label="Título"
        value={input.title}
        onChange={(event) => update("title", event.target.value)}
        required
      />
      <Textarea
        label="Descrição"
        rows={2}
        value={input.description}
        onChange={(event) => update("description", event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Área"
          value={input.areaName ?? ALL_AREAS}
          onChange={(event) => update("areaName", event.target.value || null)}
          options={[
            { value: ALL_AREAS, label: "Várias áreas" },
            ...areas.map((area) => ({ value: area.name, label: area.name })),
          ]}
        />
        <Select
          label="Dificuldade"
          value={input.difficulty}
          onChange={(event) => update("difficulty", event.target.value as Difficulty)}
          options={DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficulty }))}
        />
        <Input
          label="Tempo (minutos)"
          type="number"
          min={1}
          max={240}
          value={String(input.timeLimitMinutes)}
          onChange={(event) => update("timeLimitMinutes", Number(event.target.value))}
          required
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink-strong">
          Questões ({input.questionIds.length} selecionadas)
        </legend>
        {input.questionIds.length > 0 && (
          <p className="text-xs text-ink-muted">
            Ordem no simulado: {input.questionIds.map((id) => codeById.get(id) ?? id).join(" → ")}
          </p>
        )}
        <ul className="max-h-64 overflow-y-auto rounded-input border border-black/5 p-2">
          {questions.map((question) => (
            <li key={question.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-dropdown px-2 py-1.5 text-sm hover:bg-black/[0.03]">
                <input
                  type="checkbox"
                  checked={input.questionIds.includes(question.id)}
                  onChange={() => toggleQuestion(question.id)}
                  className="size-4 accent-brand-800"
                />
                <span className="font-semibold text-brand-800">{question.code}</span>
                <span className="truncate text-ink-strong">
                  {question.area.shortName} · {question.topic}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={saving}>
          {saving ? "Salvando..." : exam ? "Salvar alterações" : "Criar simulado"}
        </Button>
      </div>
    </form>
  );
}
