import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LoadState } from "../../../components/feedback";
import { Button, Card, ErrorMessage, Screen, Segmented, TextField } from "../../../components/ui";
import {
  createQuestion,
  getQuestionCatalog,
  listAdminQuestions,
  OPTION_IDS,
  updateQuestion,
  type QuestionCatalog,
  type QuestionInput,
} from "../../../features/admin/api";
import type { Difficulty, Question } from "../../../features/questions/api";
import { ChipRow } from "../../../features/questions/components";
import { errorMessage } from "../../../lib/format";
import { useAsync } from "../../../lib/useAsync";
import { colors, radius, spacing } from "../../../theme";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "fácil", label: "Fácil" },
  { value: "médio", label: "Médio" },
  { value: "difícil", label: "Difícil" },
];

/** Create (no id) or edit (?id=) a question — same fields as the web form. */
export default function QuestionFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const loaded = useAsync(
    async () => {
      const [catalog, questions] = await Promise.all([getQuestionCatalog(), id ? listAdminQuestions() : Promise.resolve([])]);
      return { catalog, question: id ? (questions.find((item) => item.id === id) ?? null) : null };
    },
    [id]
  );

  if (!loaded.data) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LoadState loading={loaded.loading} error={loaded.error} onRetry={loaded.reload} fallback="Não foi possível carregar o formulário." />
      </Screen>
    );
  }
  if (id && !loaded.data.question) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LoadState loading={false} error={new Error("Esta questão não existe mais.")} fallback="" />
      </Screen>
    );
  }
  return <QuestionForm key={id ?? "new"} catalog={loaded.data.catalog} question={loaded.data.question} />;
}

function initialInput(question: Question | null, catalog: QuestionCatalog): QuestionInput {
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
    areaSlug: catalog.areas[0]?.slug ?? "",
    topic: "",
    year: new Date().getFullYear(),
    difficulty: "médio",
    statement: "",
    options: ["", "", "", "", ""],
    correctOptionId: "",
    aiExplanation: "",
  };
}

function QuestionForm({ catalog, question }: { catalog: QuestionCatalog; question: Question | null }) {
  const [input, setInput] = useState<QuestionInput>(() => initialInput(question, catalog));
  const [year, setYear] = useState(String(input.year));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  const suggestions = (catalog.topicsByArea[input.areaSlug] ?? []).filter((topic) => topic !== input.topic);

  async function save() {
    if (!input.correctOptionId) {
      setError("Marque qual alternativa é a correta.");
      return;
    }
    setSaving(true);
    setError(null);
    // The API validates everything else (code format, year range, five options) with the same messages as the web.
    const payload = { ...input, year: Number(year) };
    try {
      if (question) await updateQuestion(question.id, payload);
      else await createQuestion(payload);
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: question ? `Editar ${question.code}` : "Nova questão" }} />
      <Card>
        <TextField label="Código" value={input.code} onChangeText={(value) => update("code", value)} placeholder="Q2024-15" autoCapitalize="characters" />
        <TextField label="Ano" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
        <Text style={styles.label}>Dificuldade</Text>
        <Segmented options={DIFFICULTIES} value={input.difficulty} onChange={(value) => update("difficulty", value)} />
        <ChipRow
          label="Área"
          options={catalog.areas.map((area) => ({ value: area.slug, label: area.name }))}
          value={input.areaSlug}
          onChange={(value) => value && update("areaSlug", value)}
        />
        <TextField label="Tópico" value={input.topic} onChangeText={(value) => update("topic", value)} placeholder="Ex.: Normalização de Dados" />
        {suggestions.length > 0 && (
          <ChipRow
            label="Tópicos já usados nesta área"
            options={suggestions.map((topic) => ({ value: topic, label: topic }))}
            value={undefined}
            onChange={(value) => value && update("topic", value)}
          />
        )}
        <TextField
          label="Enunciado"
          value={input.statement}
          onChangeText={(value) => update("statement", value)}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />
      </Card>

      <Card>
        <Text style={styles.label}>Alternativas (toque na letra para marcar a correta)</Text>
        {OPTION_IDS.map((optionId, index) => {
          const correct = input.correctOptionId === optionId;
          return (
            <View key={optionId} style={styles.option}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: correct }}
                accessibilityLabel={`Alternativa ${optionId.toUpperCase()} é a correta`}
                onPress={() => update("correctOptionId", optionId)}
                style={[styles.letter, correct && styles.letterCorrect]}
              >
                <Text style={[styles.letterText, correct && styles.letterTextCorrect]}>{optionId.toUpperCase()}</Text>
              </Pressable>
              <View style={styles.flex}>
                <TextField
                  label={`Texto da alternativa ${optionId.toUpperCase()}`}
                  value={input.options[index]}
                  onChangeText={(value) =>
                    update(
                      "options",
                      input.options.map((option, position) => (position === index ? value : option))
                    )
                  }
                  multiline
                />
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <TextField
          label="Explicação da IA (opcional)"
          value={input.aiExplanation}
          onChangeText={(value) => update("aiExplanation", value)}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />
        <Text style={styles.muted}>Aparece no painel “Gabarito IA” da questão.</Text>
      </Card>

      <ErrorMessage message={error} />
      <Button label={question ? "Salvar alterações" : "Criar questão"} onPress={save} loading={saving} />
      <Button label="Cancelar" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  textarea: { minHeight: 110, paddingTop: spacing(3) },
  option: { flexDirection: "row", alignItems: "flex-end", gap: spacing(3) },
  letter: {
    width: 40,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  letterCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  letterText: { fontSize: 16, fontWeight: "700", color: colors.muted },
  letterTextCorrect: { color: colors.surface },
});
