import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge, LoadState } from "../../../../components/feedback";
import { Button, Card, Screen, Subtitle, Title } from "../../../../components/ui";
import { listAdminMockExams } from "../../../../features/admin/api";
import { plural } from "../../../../lib/format";
import { useAsync } from "../../../../lib/useAsync";
import { colors, spacing, themed } from "../../../../theme";

/** Timed mock exams offered to Premium students: list, create and edit. */
export default function AdminMockExamsScreen() {
  // Reloads on focus: the form saves and comes back here.
  const exams = useAsync(listAdminMockExams, [], { reloadOnFocus: true });

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={exams.refresh} refreshing={exams.refreshing}>
      <Title>Simulados</Title>
      <Subtitle>Simulados cronometrados disponíveis para os alunos Premium.</Subtitle>
      <Button label="+ Novo simulado" onPress={() => router.push("/admin/simulado-form")} />
      <LoadState loading={exams.loading} error={exams.data ? null : exams.error} onRetry={exams.reload} fallback="Não foi possível carregar os simulados." />
      {exams.data?.length === 0 && <Text style={styles.muted}>Nenhum simulado cadastrado.</Text>}
      {exams.data?.map((exam) => (
        <Card key={exam.id}>
          <View style={styles.badges}>
            <Badge>{exam.areaName ?? "Várias áreas"}</Badge>
            <Badge tone="warning">Nível {exam.difficulty}</Badge>
          </View>
          <Text style={styles.title}>{exam.title}</Text>
          {exam.description ? <Text style={styles.muted}>{exam.description}</Text> : null}
          <Text style={styles.body}>
            {plural(exam.questionIds.length, "questão", "questões")} · {exam.timeLimitMinutes} min
          </Text>
          <Button
            label="Editar"
            variant="secondary"
            onPress={() => router.push({ pathname: "/admin/simulado-form", params: { id: exam.id } })}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  badges: { flexDirection: "row", gap: spacing(2), flexWrap: "wrap" },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink },
  body: { fontSize: 14, color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
}));
