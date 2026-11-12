import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, LockedFeature, type Tone } from "../../../../components/feedback";
import { Button, Card, Screen, Subtitle, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { listMockExams, type MockExamSummary } from "../../../../features/mock-exams/api";
import type { Difficulty } from "../../../../features/questions/api";
import { formatRelativeDay } from "../../../../lib/format";
import { userHasFeature } from "../../../../lib/plan-access";
import { useAsync } from "../../../../lib/useAsync";
import { colors, spacing, themed } from "../../../../theme";

const DIFFICULTY_TONE: Record<Difficulty, Tone> = { fácil: "success", médio: "warning", difícil: "danger" };

/** Catalog of timed mock exams: visible to every student, Premium to take. */
export default function MockExamsScreen() {
  const { user } = useAuth();
  const unlocked = userHasFeature(user, "mockExams");
  // Reloads on focus: finishing an exam changes "Última tentativa" and "Continuar".
  const exams = useAsync(listMockExams, [], { reloadOnFocus: true });

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={exams.refresh} refreshing={exams.refreshing}>
      <Title>Simulados</Title>
      <Subtitle>Treine em condições reais de prova: tempo cronometrado, navegação livre entre as questões e resultado completo ao final.</Subtitle>
      {!unlocked && (
        <LockedFeature
          feature="mockExams"
          label="Simulados com timer"
          description="Os simulados cronometrados fazem parte do plano Premium. Veja abaixo os simulados disponíveis."
        />
      )}
      <LoadState loading={exams.loading} error={exams.data ? null : exams.error} onRetry={exams.reload} fallback="Não foi possível carregar os simulados." />
      {exams.data?.map((exam) => (
        <ExamCard key={exam.id} exam={exam} locked={!unlocked} />
      ))}
    </Screen>
  );
}

function ExamCard({ exam, locked }: { exam: MockExamSummary; locked: boolean }) {
  return (
    <Card>
      <View style={styles.badges}>
        <Badge tone={DIFFICULTY_TONE[exam.difficulty]}>Nível {exam.difficulty}</Badge>
        <Badge>{exam.areaName ?? "Várias áreas"}</Badge>
      </View>
      <Text style={styles.title}>{exam.title}</Text>
      <Text style={styles.description}>{exam.description}</Text>
      <Text style={styles.meta}>
        📋 {exam.questionCount} questões · ⏱ {exam.timeLimitMinutes} min
      </Text>
      {exam.lastResult && (
        <Text style={styles.description}>
          Última tentativa ({formatRelativeDay(exam.lastResult.finishedAt).toLowerCase()}):{" "}
          <Text style={styles.bold}>
            {exam.lastResult.correctCount}/{exam.lastResult.total} acertos
          </Text>
          {exam.lastResult.status === "expirado" ? " · tempo esgotado" : ""}
        </Text>
      )}
      {locked ? (
        <Button label="🔒 Incluído no Premium" variant="secondary" disabled onPress={() => {}} />
      ) : (
        <>
          <Button
            label={exam.activeAttemptId ? "Continuar simulado" : "Começar simulado"}
            onPress={() => router.push(`/aluno/simulado/${exam.id}`)}
          />
          {exam.lastResult && (
            <Button
              label="Ver resultado"
              variant="secondary"
              onPress={() => router.push(`/aluno/simulado/resultado/${exam.lastResult?.attemptId}`)}
            />
          )}
        </>
      )}
    </Card>
  );
}

const styles = themed(() => StyleSheet.create({
  badges: { flexDirection: "row", gap: spacing(2), flexWrap: "wrap" },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  description: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  meta: { fontSize: 14, color: colors.ink },
  bold: { fontWeight: "700", color: colors.ink },
}));
