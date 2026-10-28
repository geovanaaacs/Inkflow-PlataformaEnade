import { useId, useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Input, Textarea } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { Select } from "@/design-system/components/Select";
import type { Area, Difficulty, Question } from "@/features/questions/data";
import { errorMessage } from "@/shared/api/api-error";
import { OPTION_IDS, createQuestion, updateQuestion, type QuestionInput } from "../api";

const DIFFICULTIES: Difficulty[] = ["fácil", "médio", "difícil"];

interface QuestionFormModalProps {
  open: boolean;
  /** Question being edited, or null to create a new one. */
  question: Question | null;
  areas: Area[];
  topicsByArea: Record<string, string[]>;
  onClose: () => void;
  onSaved: (question: Question) => void;
}

function initialInput(question: Question | null, areas: Area[]): QuestionInput {
  if (question) {
    return {
      code: question.code,
      areaSlug: question.area.slug,
      topic: question.topic,
      year: question.year,
      difficulty: question.difficulty,
      statement: question.statement,
      options: question.options.map((option) => option.label),
      correctOptionId: question.correctOptionId,
      aiExplanation: question.aiExplanation,
    };
  }
  return {
    code: "",
    areaSlug: areas[0]?.slug ?? "",
    topic: "",
    year: new Date().getFullYear(),
    difficulty: "médio",
    statement: "",
    options: ["", "", "", "", ""],
    correctOptionId: "",
    aiExplanation: "",
  };
}

export function QuestionFormModal({
  open,
  question,
  areas,
  topicsByArea,
  onClose,
  onSaved,
}: QuestionFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={question ? `Editar questão ${question.code}` : "Nova questão"}
      size="2xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      {/* Remount per question so the form starts from its values. */}
      <QuestionForm
        key={question?.id ?? "new"}
        question={question}
        areas={areas}
        topicsByArea={topicsByArea}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

interface QuestionFormProps {
  question: Question | null;
  areas: Area[];
  topicsByArea: Record<string, string[]>;
  onCancel: () => void;
  onSaved: (question: Question) => void;
}

function QuestionForm({ question, areas, topicsByArea, onCancel, onSaved }: QuestionFormProps) {
  const topicListId = useId();
  const [input, setInput] = useState<QuestionInput>(() => initialInput(question, areas));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = question ? await updateQuestion(question.id, input) : await createQuestion(input);
      onSaved(saved);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Código"
          placeholder="Q2024-15"
          value={input.code}
          onChange={(event) => update("code", event.target.value)}
          required
        />
        <Input
          label="Ano"
          type="number"
          min={2004}
          value={String(input.year)}
          onChange={(event) => update("year", Number(event.target.value))}
          required
        />
        <Select
          label="Dificuldade"
          value={input.difficulty}
          onChange={(event) => update("difficulty", event.target.value as Difficulty)}
          options={DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficulty }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Área"
          value={input.areaSlug}
          onChange={(event) => update("areaSlug", event.target.value)}
          options={areas.map((area) => ({ value: area.slug, label: area.name }))}
        />
        <div>
          <Input
            label="Tópico"
            placeholder="Ex.: Normalização de Dados"
            list={topicListId}
            value={input.topic}
            onChange={(event) => update("topic", event.target.value)}
            required
          />
          <datalist id={topicListId}>
            {(topicsByArea[input.areaSlug] ?? []).map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </div>
      </div>

      <Textarea
        label="Enunciado"
        rows={5}
        value={input.statement}
        onChange={(event) => update("statement", event.target.value)}
        required
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-ink-strong">
          Alternativas <span className="font-normal text-ink-muted">(marque a correta)</span>
        </legend>
        {OPTION_IDS.map((optionId, index) => (
          <div key={optionId} className="flex items-center gap-3">
            <input
              type="radio"
              name="correct-option"
              value={optionId}
              checked={input.correctOptionId === optionId}
              onChange={() => update("correctOptionId", optionId)}
              aria-label={`Alternativa ${optionId.toUpperCase()} é a correta`}
              className="size-4 accent-brand-800"
            />
            <span className="w-5 text-sm font-semibold text-brand-800">{optionId.toUpperCase()})</span>
            <label className="sr-only" htmlFor={`option-${optionId}`}>
              Texto da alternativa {optionId.toUpperCase()}
            </label>
            <input
              id={`option-${optionId}`}
              value={input.options[index]}
              onChange={(event) =>
                update(
                  "options",
                  input.options.map((option, position) => (position === index ? event.target.value : option))
                )
              }
              className="h-11 flex-1 rounded-input border border-transparent bg-app-surface px-4 text-sm text-ink-strong shadow-input focus-visible:border-brand-600"
              required
            />
          </div>
        ))}
      </fieldset>

      <Textarea
        label="Explicação da IA (opcional)"
        hint="Aparece no painel “Gabarito IA” da questão."
        rows={3}
        value={input.aiExplanation}
        onChange={(event) => update("aiExplanation", event.target.value)}
      />

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
          {saving ? "Salvando..." : question ? "Salvar alterações" : "Criar questão"}
        </Button>
      </div>
    </form>
  );
}
