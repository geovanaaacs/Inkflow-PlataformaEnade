import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, type Tone } from "../../../../components/feedback";
import { Button, Card, Screen, Subtitle, TextField, Title } from "../../../../components/ui";
import { deleteQuestion, getQuestionCatalog, listAdminQuestions } from "../../../../features/admin/api";
import type { Difficulty, Question } from "../../../../features/questions/api";
import { ChipRow } from "../../../../features/questions/components";
import { errorMessage, plural } from "../../../../lib/format";
import { useAsync } from "../../../../lib/useAsync";
import { colors, spacing } from "../../../../theme";

const DIFFICULTY_TONE: Record<Difficulty, Tone> = { fácil: "success", médio: "warning", difícil: "danger" };

/** Question bank management: list, create, edit and remove. */
export default function AdminQuestionsScreen() {
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [areaSlug, setAreaSlug] = useState<string>();
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const catalog = useAsync(getQuestionCatalog, []);
  // Reloads on focus: the form saves and comes back here.
  const questions = useAsync(() => listAdminQuestions({ search, areaSlug }), [search, areaSlug], { reloadOnFocus: true });

  async function remove(question: Question) {
    setRemoving(question.id);
    setFeedback(null);
    try {
      await deleteQuestion(question.id);
      setFeedback({ tone: "success", text: `Questão ${question.code} removida.` });
      questions.refresh();
    } catch (caught) {
      setFeedback({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setRemoving(null);
    }
  }

  function confirmRemove(question: Question) {
    Alert.alert(
      `Remover a questão ${question.code}?`,
      "Ela sai do banco de questões e dos simulados em que aparece. As respostas já dadas continuam no histórico dos alunos.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => void remove(question) },
      ]
    );
  }

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={questions.refresh} refreshing={questions.refreshing}>
      <Title>Questões</Title>
      <Subtitle>Banco de questões usado na aba Questões e nos simulados.</Subtitle>
      <Button label="+ Nova questão" onPress={() => router.push("/admin/questao-form")} />
      <TextField
        label="Buscar por código, tópico ou enunciado"
        value={draftSearch}
        onChangeText={setDraftSearch}
        returnKeyType="search"
        autoCapitalize="none"
        onSubmitEditing={() => setSearch(draftSearch)}
      />
      {catalog.data && (
        <ChipRow
          label="Área"
          options={catalog.data.areas.map((area) => ({ value: area.slug, label: area.shortName }))}
          value={areaSlug}
          onChange={setAreaSlug}
        />
      )}
      {feedback && <Text style={[styles.feedback, { color: feedback.tone === "success" ? colors.success : colors.danger }]}>{feedback.text}</Text>}
      <LoadState loading={questions.loading} error={questions.data ? null : questions.error} onRetry={questions.reload} fallback="Não foi possível carregar as questões." />
      {questions.data && <Text style={styles.muted}>{plural(questions.data.length, "questão", "questões")}</Text>}
      {questions.data?.length === 0 && <Text style={styles.muted}>Nenhuma questão encontrada.</Text>}
      {questions.data?.map((question) => (
        <Card key={question.id}>
          <View style={styles.header}>
            <Text style={styles.code}>{question.code}</Text>
            <Badge tone={DIFFICULTY_TONE[question.difficulty]}>{question.difficulty}</Badge>
          </View>
          <Text style={styles.body}>
            {question.area.name} › {question.topic} · {question.year}
          </Text>
          <Text style={styles.muted} numberOfLines={2}>
            {question.statement}
          </Text>
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label="Editar" variant="secondary" onPress={() => router.push({ pathname: "/admin/questao-form", params: { id: question.id } })} />
            </View>
            <View style={styles.flex}>
              <Button label="Remover" variant="secondary" loading={removing === question.id} disabled={removing !== null} onPress={() => confirmRemove(question)} />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  feedback: { fontSize: 15, fontWeight: "700" },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  body: { fontSize: 14, color: colors.ink },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { fontSize: 16, fontWeight: "700", color: colors.brand800 },
  actions: { flexDirection: "row", gap: spacing(2) },
});
