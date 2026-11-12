import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, ProgressBar, SectionTitle } from "../../../../components/feedback";
import type { IconName } from "../../../../components/navigation";
import { Button, Card, Screen, Subtitle, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { ChipRow } from "../../../../features/questions/components";
import { getTeacherOverview, type MissedQuestion, type StudentAnswerRow, type TeacherOverview } from "../../../../features/teacher/api";
import { formatDateTime, plural } from "../../../../lib/format";
import { useAsync } from "../../../../lib/useAsync";
import { colors, radius, spacing, themed } from "../../../../theme";

/** How students are doing on the question bank (only answers given as a student count). */
export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const overview = useAsync(getTeacherOverview, [], { reloadOnFocus: true });
  const data = overview.data;

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={overview.refresh} refreshing={overview.refreshing}>
      <Title>Painel do professor</Title>
      <Subtitle>Olá, {user?.name.split(" ")[0]}. Acompanhe as questões respondidas pelos alunos.</Subtitle>
      <LoadState loading={overview.loading} error={data ? null : overview.error} onRetry={overview.reload} fallback="Não foi possível carregar o painel." />
      {data && (
        <>
          {data.pendingRequests > 0 && (
            <Pressable accessibilityRole="link" onPress={() => router.navigate("/professor/agenda")} style={styles.pending}>
              <Text style={styles.pendingText}>
                📅 {plural(data.pendingRequests, "solicitação de mentoria aguardando", "solicitações de mentoria aguardando")} sua resposta
              </Text>
              <Text style={styles.pendingLink}>Abrir agenda →</Text>
            </Pressable>
          )}
          <Stats data={data} />
          <MostMissed questions={data.mostMissed} />
          <Answers rows={data.rows} students={data.students} areas={data.areas} />
        </>
      )}
    </Screen>
  );
}

function Stats({ data }: { data: TeacherOverview }) {
  const stats: { icon: IconName; value: string; label: string; color: string }[] = [
    { icon: "list-outline", value: String(data.totalAnswers), label: "Respostas registradas", color: colors.brandText },
    { icon: "people-outline", value: String(data.activeStudents), label: "Alunos ativos", color: colors.brandText },
    { icon: "checkmark-circle-outline", value: `${data.accuracyPercent}%`, label: "Acerto (1ª tentativa)", color: colors.success },
    { icon: "today-outline", value: String(data.answersToday), label: "Respostas hoje", color: colors.warning },
  ];
  return (
    <View style={styles.statsGrid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Ionicons name={stat.icon} size={20} color={stat.color} />
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function MostMissed({ questions }: { questions: MissedQuestion[] }) {
  return (
    <Card>
      <SectionTitle title="Questões com mais erros" subtitle="Primeira tentativa de cada aluno: bons temas para a próxima mentoria." />
      {questions.length === 0 ? (
        <Text style={styles.muted}>Nenhum erro registrado até agora.</Text>
      ) : (
        questions.map((question) => (
          <View key={question.questionCode} style={styles.missed}>
            <View style={styles.rowBetween}>
              <Text style={[styles.body, styles.flex]}>
                <Text style={styles.code}>[{question.questionCode}] </Text>
                {question.topic}
              </Text>
              <Text style={styles.errorRate}>{question.errorRate}% de erro</Text>
            </View>
            <ProgressBar value={question.errorRate} tone="danger" label={`${question.questionCode}: ${question.errorRate}% de erro`} />
            <Text style={styles.small}>
              {question.areaName} · {plural(question.answers, "resposta", "respostas")}
              {question.commonMistake
                ? ` · erro mais comum: alternativa ${question.commonMistake.optionId.toUpperCase()} (${question.commonMistake.percent}%)`
                : ""}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}

type ResultFilter = "acertos" | "erros";
const PAGE_SIZE = 15;

function Answers({ rows, students, areas }: Pick<TeacherOverview, "rows" | "students" | "areas">) {
  const [area, setArea] = useState<string>();
  const [student, setStudent] = useState<string>();
  const [result, setResult] = useState<ResultFilter>();
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!area || row.area.slug === area) &&
          (!student || row.studentId === student) &&
          (!result || (result === "acertos" ? row.correct : !row.correct))
      ),
    [rows, area, student, result]
  );

  /** Changing a filter starts the list from the top again. */
  function filterWith<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setVisible(PAGE_SIZE);
    };
  }

  return (
    <Card>
      <SectionTitle title="Respostas dos alunos" subtitle={`${plural(filtered.length, "resposta encontrada", "respostas encontradas")}, das mais recentes às mais antigas`} />
      <ChipRow label="Área" options={areas.map((item) => ({ value: item.slug, label: item.shortName }))} value={area} onChange={filterWith(setArea)} />
      <ChipRow label="Aluno" options={students.map((item) => ({ value: item.id, label: item.name }))} value={student} onChange={filterWith(setStudent)} />
      <ChipRow<ResultFilter>
        label="Resultado"
        options={[
          { value: "acertos", label: "Acertos" },
          { value: "erros", label: "Erros" },
        ]}
        value={result}
        onChange={filterWith(setResult)}
      />
      {filtered.length === 0 ? (
        <Text style={styles.muted}>Nenhuma resposta para os filtros selecionados.</Text>
      ) : (
        filtered.slice(0, visible).map((row) => <AnswerRow key={row.id} row={row} />)
      )}
      {filtered.length > visible && (
        <Button
          label={`Mostrar mais (${filtered.length - visible} restantes)`}
          variant="secondary"
          onPress={() => setVisible((current) => current + PAGE_SIZE)}
        />
      )}
    </Card>
  );
}

function AnswerRow({ row }: { row: StudentAnswerRow }) {
  return (
    <View style={styles.answer}>
      <Ionicons
        name={row.correct ? "checkmark-circle" : "close-circle"}
        size={22}
        color={row.correct ? colors.success : colors.danger}
        accessibilityLabel={row.correct ? "Acertou" : "Errou"}
      />
      <View style={styles.flex}>
        <Text style={styles.body}>
          <Text style={styles.bold}>{row.studentName}</Text> · <Text style={styles.code}>{row.questionCode}</Text>
        </Text>
        <Text style={styles.small}>
          {row.area.shortName} · {row.topic}
        </Text>
        <Text style={styles.small}>
          Resposta {row.selectedOptionId.toUpperCase()} (gabarito {row.correctOptionId.toUpperCase()})
          {row.attemptNumber > 1 ? ` · ${row.attemptNumber}ª tentativa` : ""} · {formatDateTime(row.answeredAt)}
        </Text>
      </View>
      <Badge tone={row.fromMockExam ? "brand" : "success"}>{row.fromMockExam ? "Simulado" : "Prática"}</Badge>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 12, color: colors.muted },
  body: { fontSize: 14, color: colors.ink },
  bold: { fontWeight: "700" },
  code: { fontWeight: "700", color: colors.brandText },
  rowBetween: { flexDirection: "row", gap: spacing(2), alignItems: "flex-start" },
  pending: { backgroundColor: `${colors.warning}26`, borderRadius: radius.card, padding: spacing(4), gap: spacing(1) },
  pendingText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  pendingLink: { fontSize: 14, fontWeight: "700", color: colors.brand600 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  stat: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(4),
    gap: spacing(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statValue: { fontSize: 24, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 13, color: colors.muted },
  missed: { gap: spacing(1.5) },
  errorRate: { fontSize: 13, fontWeight: "700", color: colors.danger },
  answer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
