import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, PlanBanner, ProgressBar, SectionTitle, toneForPercent } from "../../../../components/feedback";
import { Button, Card, Screen, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { getDashboardOverview, type StudentStats } from "../../../../features/dashboard/api";
import { usePractice } from "../../../../features/questions/practice";
import { formatRelativeDay, plural } from "../../../../lib/format";
import { hasFeature, PLAN_LABEL, FEATURE_MIN_PLAN, type FeatureKey } from "../../../../lib/plan-access";
import { useAsync } from "../../../../lib/useAsync";
import { colors, radius, spacing } from "../../../../theme";

/** Premium features teased at the bottom while the student doesn't have them. */
const UPSELLS: { feature: FeatureKey; label: string }[] = [
  { feature: "mockExams", label: "Simulados com timer" },
  { feature: "mentoring", label: "Mentoria com professores" },
];

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function streakMessage(streak: number, best: number): string {
  if (best === 0) return "Responda uma questão hoje para começar";
  if (streak === best) return `Melhor: ${plural(best, "dia", "dias")} · Recorde pessoal!`;
  return `Melhor: ${plural(best, "dia", "dias")}`;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const plan = user?.plan ?? "basico";
  const practice = usePractice();
  // Reloads when coming back from a question, so the numbers follow the answers.
  const overview = useAsync(getDashboardOverview, [plan], { reloadOnFocus: true });
  const data = overview.data;

  // The banner on the other tabs follows the usage the dashboard just loaded.
  const { setUsage } = practice;
  useEffect(() => {
    if (data) setUsage(data.dailyUsage);
  }, [data, setUsage]);

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={overview.refresh} refreshing={overview.refreshing}>
      <Title>Olá, {firstName}!</Title>
      <LoadState
        loading={overview.loading}
        error={data ? null : overview.error}
        onRetry={overview.reload}
        fallback="Não foi possível carregar o dashboard."
      />
      {data && (
        <>
          <PlanBanner planId={plan} usage={data.dailyUsage} />
          <Stats stats={data.stats} />

          <Card>
            <SectionTitle title="Desempenho por área" subtitle="Acertos na primeira tentativa" />
            {data.areaPerformance.length === 0 ? (
              <Text style={styles.muted}>Responda questões para ver seu desempenho por área.</Text>
            ) : (
              data.areaPerformance.map((area) => (
                <View key={area.area} style={styles.areaRow}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.areaName}>{area.area}</Text>
                    <Text style={styles.areaPercent}>{area.percent}%</Text>
                  </View>
                  <ProgressBar value={area.percent} tone={toneForPercent(area.percent)} label={`${area.area}: ${area.percent}%`} />
                  <Text style={styles.small}>{plural(area.questionsCount, "questão", "questões")}</Text>
                </View>
              ))
            )}
            <Button
              label={hasFeature(plan, "notes") ? "Minhas anotações" : "Minhas anotações 🔒"}
              variant="secondary"
              onPress={() => router.push("/aluno/anotacoes")}
            />
          </Card>

          <Card>
            <SectionTitle title="Meus acertos e erros" />
            {data.recentAnswers.length === 0 ? (
              <Text style={styles.muted}>Você ainda não respondeu nenhuma questão. Que tal começar agora?</Text>
            ) : (
              data.recentAnswers.map((answer) => (
                <View key={answer.id} style={styles.answerRow}>
                  <Ionicons
                    name={answer.correct ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={answer.correct ? colors.success : colors.danger}
                    accessibilityLabel={answer.correct ? "Acertou" : "Errou"}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.answerCode}>{answer.questionCode}</Text>
                    <Text style={styles.small}>
                      {answer.topic} · {formatRelativeDay(answer.answeredAt)}
                    </Text>
                  </View>
                  <Text
                    style={styles.link}
                    accessibilityRole="link"
                    accessibilityLabel={`Revisar questão ${answer.questionCode}`}
                    onPress={() => router.push(`/aluno/questao/${answer.questionCode}`)}
                  >
                    Revisar
                  </Text>
                </View>
              ))
            )}
            {!hasFeature(plan, "fullHistory") && (
              <Button
                label="Ver histórico completo (Plano Avançado)"
                variant="secondary"
                onPress={() => router.push("/aluno/planos")}
              />
            )}
          </Card>

          <SectionTitle title="Questões sugeridas" subtitle="Baseado no seu curso e histórico de desempenho" />
          {data.suggestedTopics.map((topic) => (
            <Card key={topic.areaSlug}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.small}>
                Nível {topic.level} · {plural(topic.totalQuestions, "questão disponível", "questões disponíveis")}
              </Text>
              <ProgressBar value={topic.percent} tone={toneForPercent(topic.percent)} label={`${topic.title}: ${topic.percent}% de acerto`} />
              <Text style={styles.body}>
                {topic.percent}% de acerto · {topic.message}
              </Text>
              <Button label="Praticar agora" onPress={() => router.push(`/aluno/tema/${topic.areaSlug}`)} />
            </Card>
          ))}

          {UPSELLS.filter(({ feature }) => !hasFeature(plan, feature)).map(({ feature, label }) => (
            <View key={feature} style={styles.upsell}>
              <Text style={styles.upsellText}>🔒 {label}</Text>
              <Badge>Plano {PLAN_LABEL[FEATURE_MIN_PLAN[feature]]}</Badge>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function Stats({ stats }: { stats: StudentStats }) {
  return (
    <View style={styles.stats}>
      <StatCard
        icon="list-outline"
        value={String(stats.answered)}
        label="Questões respondidas"
        progress={percentOf(stats.answered, stats.totalQuestions)}
        delta={stats.answeredThisWeek > 0 ? `+${stats.answeredThisWeek} esta semana` : "Nenhuma nova esta semana"}
        positive={stats.answeredThisWeek > 0}
      />
      <StatCard
        icon="locate-outline"
        value={`${stats.accuracyPercent}%`}
        label="Taxa de acerto geral"
        progress={stats.accuracyPercent}
        delta="Na primeira tentativa de cada questão"
      />
      <StatCard
        icon="flame-outline"
        tone="danger"
        value={String(stats.streak)}
        label="Dias seguidos"
        progress={percentOf(stats.streak, stats.bestStreak)}
        delta={streakMessage(stats.streak, stats.bestStreak)}
      />
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  progress,
  delta,
  positive = false,
  tone = "brand",
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
  progress: number;
  delta: string;
  positive?: boolean;
  tone?: "brand" | "danger";
}) {
  const color = tone === "danger" ? colors.danger : colors.brand800;
  return (
    <Card>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}1f` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={[styles.body, styles.flex]}>{label}</Text>
      </View>
      <ProgressBar value={progress} tone={tone} label={label} />
      <Text style={[styles.small, positive && styles.positive]}>{delta}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  body: { fontSize: 14, color: colors.ink },
  link: { fontSize: 14, color: colors.brand600, fontWeight: "700", padding: spacing(1) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  areaRow: { gap: spacing(1.5) },
  areaName: { fontSize: 14, fontWeight: "600", color: colors.ink, flex: 1 },
  areaPercent: { fontSize: 14, fontWeight: "700", color: colors.ink },
  answerRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  answerCode: { fontSize: 14, fontWeight: "700", color: colors.ink },
  topicTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  stats: { gap: spacing(3) },
  statHeader: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 26, fontWeight: "700", color: colors.ink },
  positive: { color: colors.success, fontWeight: "700" },
  upsell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  upsellText: { fontSize: 14, fontWeight: "600", color: colors.ink },
});
