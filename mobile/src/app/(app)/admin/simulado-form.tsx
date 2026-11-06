import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LoadState } from "../../../components/feedback";
import { Button, Card, ErrorMessage, Screen, Segmented, TextField } from "../../../components/ui";
import {
  createMockExam,
  getQuestionCatalog,
  listAdminMockExams,
  listAdminQuestions,
  updateMockExam,
  type MockExamInput,
} from "../../../features/admin/api";
import type { MockExam } from "../../../features/mock-exams/api";
import type { Area, Difficulty, Question } from "../../../features/questions/api";
import { ChipRow } from "../../../features/questions/components";
import { errorMessage } from "../../../lib/format";
import { useAsync } from "../../../lib/useAsync";
import { colors, radius, spacing } from "../../../theme";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "fácil", label: "Fácil" },
  { value: "médio", label: "Médio" },
  { value: "difícil", label: "Difícil" },
];

/** Create (no id) or edit (?id=) a mock exam — same fields as the web form. */
export default function MockExamFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const loaded = useAsync(
    async () => {
      const [exams, questions, catalog] = await Promise.all([listAdminMockExams(), listAdminQuestions(), getQuestionCatalog()]);
      return { exam: id ? (exams.find((item) => item.id === id) ?? null) : null, questions, areas: catalog.areas };
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
  if (id && !loaded.data.exam) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LoadState loading={false} error={new Error("Este simulado não existe mais.")} fallback="" />
      </Screen>
    );
  }
  return <MockExamForm key={id ?? "new"} exam={loaded.data.exam} questions={loaded.data.questions} areas={loaded.data.areas} />;
}

function MockExamForm({ exam, questions, areas }: { exam: MockExam | null; questions: Question[]; areas: Area[] }) {
  const [input, setInput] = useState<MockExamInput>(() => ({
    title: exam?.title ?? "",
    description: exam?.description ?? "",
    areaName: exam?.areaName ?? null,
    difficulty: exam?.difficulty ?? "médio",
    timeLimitMinutes: exam?.timeLimitMinutes ?? 30,
    questionIds: exam?.questionIds ?? [],
  }));
  const [minutes, setMinutes] = useState(String(input.timeLimitMinutes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MockExamInput>(key: K, value: MockExamInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  /** Keeps the exam order: questions are added at the end, removed in place. */
  function toggle(questionId: string) {
    update(
      "questionIds",
      input.questionIds.includes(questionId) ? input.questionIds.filter((item) => item !== questionId) : [...input.questionIds, questionId]
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    // The API validates title, time range and "at least one question" with the same messages as the web.
    const payload = { ...input, timeLimitMinutes: Number(minutes) };
    try {
      if (exam) await updateMockExam(exam.id, payload);
      else await createMockExam(payload);
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  const codeById = new Map(questions.map((question) => [question.id, question.code]));

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: exam ? "Editar simulado" : "Novo simulado" }} />
      <Card>
        <TextField label="Título" value={input.title} onChangeText={(value) => update("title", value)} maxLength={150} />
        <TextField
          label="Descrição"
          value={input.description}
          onChangeText={(value) => update("description", value)}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          style={styles.textarea}
        />
        <ChipRow
          label="Área (nenhuma marcada = várias áreas)"
          options={areas.map((area) => ({ value: area.name, label: area.name }))}
          value={input.areaName ?? undefined}
          onChange={(value) => update("areaName", value ?? null)}
        />
        <Text style={styles.label}>Dificuldade</Text>
        <Segmented options={DIFFICULTIES} value={input.difficulty} onChange={(value) => update("difficulty", value)} />
        <TextField label="Tempo (minutos, de 1 a 240)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" maxLength={3} />
      </Card>

      <Card>
        <Text style={styles.label}>Questões ({input.questionIds.length} selecionadas)</Text>
        {input.questionIds.length > 0 && (
          <Text style={styles.muted}>Ordem no simulado: {input.questionIds.map((item) => codeById.get(item) ?? item).join(" → ")}</Text>
        )}
        {questions.map((question) => {
          const position = input.questionIds.indexOf(question.id);
          const selected = position !== -1;
          return (
            <Pressable
              key={question.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(question.id)}
              style={[styles.question, selected && styles.questionSelected]}
            >
              <View style={[styles.check, selected && styles.checkOn]}>
                {selected ? <Text style={styles.checkText}>{position + 1}</Text> : <Ionicons name="add" size={16} color={colors.muted} />}
              </View>
              <View style={styles.flex}>
                <Text style={styles.code}>{question.code}</Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {question.area.shortName} · {question.topic}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <ErrorMessage message={error} />
      <Button label={exam ? "Salvar alterações" : "Criar simulado"} onPress={save} loading={saving} />
      <Button label="Cancelar" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  textarea: { minHeight: 80, paddingTop: spacing(3) },
  question: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(2.5),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionSelected: { borderColor: colors.brand600, backgroundColor: colors.brandSoft },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  checkText: { color: colors.surface, fontWeight: "700", fontSize: 13 },
  code: { fontSize: 14, fontWeight: "700", color: colors.brand800 },
});
