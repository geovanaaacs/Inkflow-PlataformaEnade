import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, ProgressBar, SectionTitle, toneForPercent } from "../../../../../components/feedback";
import { Button, Card, Screen, Title } from "../../../../../components/ui";
import { getAttemptDetails } from "../../../../../features/mock-exams/api";
import { formatElapsed, plural } from "../../../../../lib/format";
import { useAsync } from "../../../../../lib/useAsync";
import { colors, radius, spacing, themed } from "../../../../../theme";

/** Score, time spent and question-by-question review of a finished attempt. */
export default function MockExamResultScreen() {
  const { attemptId = "" } = useLocalSearchParams<{ attemptId: string }>();
  const details = useAsync(() => getAttemptDetails(attemptId), [attemptId]);

  if (!details.data) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LoadState loading={details.loading} error={details.error} onRetry={details.reload} fallback="Não foi possível carregar o resultado." />
      </Screen>
    );
  }

  const { attempt, exam, questions } = details.data;
  // Still running: back to the exam screen to resume it.
  if (attempt.status === "em_andamento" || !attempt.results) return <Redirect href={`/aluno/simulado/${exam.id}`} />;

  const results = attempt.results;
  const correct = results.filter((result) => result.correct).length;
  const unanswered = results.filter((result) => result.selectedOptionId === null).length;
  const percent = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;
  const elapsed = Math.min(
    exam.timeLimitMinutes * 60_000,
    new Date(attempt.finishedAt ?? attempt.endsAt).getTime() - new Date(attempt.startedAt).getTime()
  );
  const timedOut = attempt.status === "expirado";

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Card>
        <Badge tone={timedOut ? "danger" : "success"}>{timedOut ? "Tempo esgotado" : "Finalizado"}</Badge>
        <Title>{exam.title}</Title>
        <View style={styles.scores}>
          <Score label="Acertos" value={`${correct}/${results.length}`} highlight />
          <Score label="Aproveitamento" value={`${percent}%`} />
          <Score label="Tempo" value={formatElapsed(elapsed)} hint={`de ${exam.timeLimitMinutes} min`} />
        </View>
        <ProgressBar value={percent} tone={toneForPercent(percent)} label={`Aproveitamento: ${percent}%`} />
        {unanswered > 0 && (
          <Text style={styles.muted}>
            {plural(unanswered, "questão ficou", "questões ficaram")} sem resposta.
          </Text>
        )}
      </Card>

      <Card>
        <SectionTitle title="Correção questão a questão" />
        {results.map((result, index) => {
          const question = questions.find((item) => item.id === result.questionId);
          const skipped = result.selectedOptionId === null;
          return (
            <View key={result.questionId} style={styles.row}>
              <Ionicons
                name={skipped ? "remove-circle" : result.correct ? "checkmark-circle" : "close-circle"}
                size={22}
                color={skipped ? colors.muted : result.correct ? colors.success : colors.danger}
                accessibilityLabel={skipped ? "Não respondida" : result.correct ? "Acertou" : "Errou"}
              />
              <View style={styles.flex}>
                <Text style={styles.code}>
                  {index + 1}. {question?.code} <Text style={styles.muted}>· {question?.topic}</Text>
                </Text>
                <Text style={styles.muted}>
                  {skipped ? "Sem resposta" : `Sua resposta: ${result.selectedOptionId?.toUpperCase()}`} · Gabarito:{" "}
                  {result.correctOptionId.toUpperCase()}
                </Text>
              </View>
              {question && (
                <Text
                  style={styles.link}
                  accessibilityRole="link"
                  accessibilityLabel={`Ver questão ${question.code} com gabarito comentado`}
                  onPress={() => router.push(`/aluno/questao/${question.code}`)}
                >
                  Ver
                </Text>
              )}
            </View>
          );
        })}
      </Card>

      <Button label="Refazer simulado" onPress={() => router.replace(`/aluno/simulado/${exam.id}`)} />
      <Button label="Ver outros simulados" variant="secondary" onPress={() => router.navigate("/aluno/simulados")} />
    </Screen>
  );
}

function Score({ label, value, hint, highlight = false }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <View style={[styles.score, highlight && styles.scoreHighlight]}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, highlight && styles.scoreValueHighlight]}>{value}</Text>
      {hint ? <Text style={styles.scoreLabel}>{hint}</Text> : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  muted: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  scores: { flexDirection: "row", gap: spacing(2) },
  score: { flex: 1, alignItems: "center", gap: spacing(1), padding: spacing(3), borderRadius: radius.input, backgroundColor: colors.background },
  scoreHighlight: { backgroundColor: colors.brandSoft },
  scoreLabel: { fontSize: 12, color: colors.muted, textAlign: "center" },
  scoreValue: { fontSize: 20, fontWeight: "800", color: colors.ink, textAlign: "center" },
  scoreValueHighlight: { color: colors.brandText },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  code: { fontSize: 14, fontWeight: "700", color: colors.ink },
  link: { fontSize: 14, fontWeight: "700", color: colors.brand600, padding: spacing(1.5) },
}));
