import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, PlanBanner, ProgressBar, SectionTitle, toneForPercent } from "../../../../components/feedback";
import { Button, Card, IconText, Screen, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { getDashboardOverview, type StudentStats } from "../../../../features/dashboard/api";
import { usePractice } from "../../../../features/questions/practice";
import { formatRelativeDay, plural } from "../../../../lib/format";
import { hasFeature, PLAN_LABEL, FEATURE_MIN_PLAN, type FeatureKey } from "../../../../lib/plan-access";
import { useAsync } from "../../../../lib/useAsync";
import { colors, radius, spacing, themed } from "../../../../theme";

/** Premium features at the bottom: shortcuts when unlocked, teasers otherwise. */
const UPSELLS: { feature: FeatureKey; label: string; route: "/aluno/simulados" | "/aluno/mentoria" }[] = [
  { feature: "mockExams", label: "Simulados com timer", route: "/aluno/simulados" },
  { feature: "mentoring", label: "Mentoria com professores", route: "/aluno/mentoria" },
];

/** How many rows each list shows before "Mostrar mais". */
const VISIBLE_ROWS = 5;

/** Days drawn in the streak tile (one week). */
const STREAK_DAYS = 7;

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function streakMessage(streak: number, best: number): string {
  if (best === 0) return "Responda uma questão hoje para começar";
  if (streak > 0 && streak === best) return `Recorde pessoal: ${plural(best, "dia", "dias")}!`;
  return `Seu recorde: ${plural(best, "dia", "dias")}`;
}

/** First `VISIBLE_ROWS` items, or all of them once expanded. */
function useExpandable<T>(items: T[]) {
  const [expanded, setExpanded] = useState(false);
  return {
    visible: expanded ? items : items.slice(0, VISIBLE_ROWS),
    hidden: Math.max(0, items.length - VISIBLE_ROWS),
    expanded,
    toggle: () => setExpanded((value) => !value),
  };
}

function ShowMore({ hidden, expanded, onPress }: { hidden: number; expanded: boolean; onPress: () => void }) {
  if (hidden === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
    >
      <Text style={styles.showMoreText}>{expanded ? "Mostrar menos" : `Mostrar mais (${hidden})`}</Text>
      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.brandText} />
    </Pressable>
  );
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

  // Areas the student practiced first, so the first five say something.
  const areas = useMemo(
    () =>
      [...(data?.areaPerformance ?? [])].sort(
        (a, b) => Number(b.questionsCount > 0) - Number(a.questionsCount > 0) || b.percent - a.percent
      ),
    [data]
  );
  const areaList = useExpandable(areas);
  const answerList = useExpandable(data?.recentAnswers ?? []);
  const topicList = useExpandable(data?.suggestedTopics ?? []);

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={overview.refresh} refreshing={overview.refreshing}>
      <View>
        <Text style={styles.greeting}>Bons estudos,</Text>
        <Title>Olá, {firstName}!</Title>
      </View>
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

          {/* Performance by area: five rows, the rest behind "Mostrar mais". */}
          <Card>
            <SectionTitle title="Desempenho por área" subtitle="Acertos na primeira tentativa" />
            {areas.length === 0 ? (
              <Text style={styles.muted}>Responda questões para ver seu desempenho por área.</Text>
            ) : (
              areaList.visible.map((area) => (
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
            <ShowMore hidden={areaList.hidden} expanded={areaList.expanded} onPress={areaList.toggle} />
          </Card>
          <Button
            label="Minhas anotações"
            size="large"
            icon={hasFeature(plan, "notes") ? "document-text-outline" : "lock-closed-outline"}
            onPress={() => router.push("/aluno/anotacoes")}
          />

          <Card>
            <SectionTitle title="Meus acertos e erros" />
            {data.recentAnswers.length === 0 ? (
              <Text style={styles.muted}>Você ainda não respondeu nenhuma questão. Que tal começar agora?</Text>
            ) : (
              answerList.visible.map((answer) => (
                <View key={answer.id} style={styles.answerRow}>
                  <Ionicons
                    name={answer.correct ? "checkmark-circle" : "close-circle"}
                    size={22}
                    color={answer.correct ? colors.success : colors.danger}
                    accessibilityLabel={answer.correct ? "Acertou" : "Errou"}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.answerCode}>{answer.questionCode}</Text>
                    <Text style={styles.small}>
                      {answer.topic} · {formatRelativeDay(answer.answeredAt)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Revisar questão ${answer.questionCode}`}
                    onPress={() => router.push(`/aluno/questao/${answer.questionCode}`)}
                    style={({ pressed }) => [styles.reviewPill, pressed && styles.pressed]}
                  >
                    <Text style={styles.reviewText}>Revisar</Text>
                  </Pressable>
                </View>
              ))
            )}
            <ShowMore hidden={answerList.hidden} expanded={answerList.expanded} onPress={answerList.toggle} />
          </Card>
          {!hasFeature(plan, "fullHistory") && (
            <Button
              label="Ver histórico completo"
              size="large"
              icon="lock-closed-outline"
              onPress={() => router.push("/aluno/planos")}
            />
          )}

          <Card>
            <SectionTitle title="Questões sugeridas" subtitle="Baseado no seu curso e histórico de desempenho" />
            {topicList.visible.map((topic) => (
              <View key={topic.areaSlug} style={styles.topicRow}>
                <View style={styles.rowBetween}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.areaPercent}>{topic.percent}%</Text>
                </View>
                <Text style={styles.small}>
                  Nível {topic.level} · {plural(topic.totalQuestions, "questão disponível", "questões disponíveis")}
                </Text>
                <ProgressBar value={topic.percent} tone={toneForPercent(topic.percent)} label={`${topic.title}: ${topic.percent}% de acerto`} />
                <Text style={styles.body}>{topic.message}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Praticar ${topic.title}`}
                  onPress={() => router.push(`/aluno/tema/${topic.areaSlug}`)}
                  style={({ pressed }) => [styles.practicePill, pressed && styles.pressed]}
                >
                  <Ionicons name="play" size={14} color={colors.onBrand} />
                  <Text style={styles.practiceText}>Praticar agora</Text>
                </Pressable>
              </View>
            ))}
            <ShowMore hidden={topicList.hidden} expanded={topicList.expanded} onPress={topicList.toggle} />
          </Card>
          <Button label="Ver todas as questões" size="large" icon="list-outline" onPress={() => router.navigate("/aluno/questoes")} />

          {/* Premium shortcuts: open when unlocked, a teaser with the plan otherwise. */}
          {UPSELLS.map(({ feature, label, route }) =>
            hasFeature(plan, feature) ? (
              <Button key={feature} label={label} variant="secondary" onPress={() => router.push(route)} />
            ) : (
              <View key={feature} style={styles.upsell}>
                <IconText icon="lock-closed-outline" style={styles.upsellText}>{label}</IconText>
                <Badge>Plano {PLAN_LABEL[FEATURE_MIN_PLAN[feature]]}</Badge>
              </View>
            )
          )}
        </>
      )}
    </Screen>
  );
}

/** Two tiles side by side (answered, accuracy) and the streak across the width. */
function Stats({ stats }: { stats: StudentStats }) {
  return (
    <View style={styles.stats}>
      <View style={styles.statsRow}>
        <StatTile
          icon="checkmark-done"
          value={String(stats.answered)}
          label="Questões respondidas"
          chip={stats.answeredThisWeek > 0 ? `+${stats.answeredThisWeek} semana` : undefined}
          progress={percentOf(stats.answered, stats.totalQuestions)}
          caption={`de ${stats.totalQuestions} no banco`}
          variant="solid"
        />
        <StatTile
          icon="analytics"
          value={`${stats.accuracyPercent}%`}
          label="Taxa de acerto"
          progress={stats.accuracyPercent}
          caption="Na 1ª tentativa"
          variant="soft"
        />
      </View>
      <StreakTile streak={stats.streak} best={stats.bestStreak} />
    </View>
  );
}

function StatTile({
  icon,
  value,
  label,
  chip,
  progress,
  caption,
  variant,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
  chip?: string;
  progress: number;
  caption: string;
  variant: "solid" | "soft";
}) {
  const solid = variant === "solid";
  const ink = solid ? colors.onBrand : colors.brandText;
  return (
    <View style={[styles.tile, solid ? styles.tileSolid : styles.tileSoft]} accessible accessibilityLabel={`${label}: ${value}. ${caption}`}>
      <View style={styles.rowBetween}>
        <View style={[styles.tileIcon, solid ? styles.tileIconSolid : styles.tileIconSoft]}>
          <Ionicons name={icon} size={18} color={ink} />
        </View>
        {chip ? (
          <View style={[styles.chip, solid ? styles.chipSolid : styles.chipSoft]}>
            <Text style={[styles.chipText, { color: ink }]}>{chip}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tileValue, { color: solid ? colors.onBrand : colors.ink }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: solid ? colors.onBrand : colors.ink }]}>{label}</Text>
      <View style={[styles.tileTrack, solid && styles.tileTrackSolid]}>
        <View style={[styles.tileFill, solid && styles.tileFillSolid, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
      </View>
      <Text style={[styles.tileCaption, solid && styles.tileCaptionSolid]}>{caption}</Text>
    </View>
  );
}

/** Streak with one dot per day of the current week. */
function StreakTile({ streak, best }: { streak: number; best: number }) {
  const filled = Math.min(streak, STREAK_DAYS);
  return (
    <View style={[styles.tile, styles.tileSoft, styles.streak]} accessible accessibilityLabel={`${plural(streak, "dia seguido", "dias seguidos")}. ${streakMessage(streak, best)}`}>
      <View style={[styles.tileIcon, styles.streakIcon]}>
        <Ionicons name="flame" size={22} color={colors.warning} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.streakValue}>
          {streak} <Text style={styles.streakUnit}>{streak === 1 ? "dia seguido" : "dias seguidos"}</Text>
        </Text>
        <View style={styles.streakDots}>
          {Array.from({ length: STREAK_DAYS }, (_, index) => (
            <View key={index} style={[styles.streakDot, index < filled && styles.streakDotOn]} />
          ))}
        </View>
        <Text style={styles.small}>{streakMessage(streak, best)}</Text>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  greeting: { fontSize: 15, color: colors.brandText, fontWeight: "600" },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  body: { fontSize: 14, color: colors.ink },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing(2) },
  areaRow: { gap: spacing(1.5) },
  areaName: { fontSize: 14, fontWeight: "600", color: colors.ink, flex: 1 },
  areaPercent: { fontSize: 14, fontWeight: "700", color: colors.brandText },
  answerRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  answerCode: { fontSize: 14, fontWeight: "700", color: colors.ink },
  reviewPill: { backgroundColor: colors.brandSoft, borderRadius: 999, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5) },
  reviewText: { fontSize: 13, fontWeight: "700", color: colors.brandText },
  topicRow: { gap: spacing(1.5), paddingBottom: spacing(3), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  topicTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 },
  practicePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.brand600,
    borderRadius: 999,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    marginTop: spacing(1),
  },
  practiceText: { fontSize: 14, fontWeight: "700", color: colors.onBrand },
  showMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1.5),
    paddingVertical: spacing(2.5),
    borderRadius: radius.button,
    backgroundColor: colors.brandSoft,
  },
  showMoreText: { fontSize: 14, fontWeight: "700", color: colors.brandText },
  stats: { gap: spacing(3) },
  statsRow: { flexDirection: "row", gap: spacing(3) },
  tile: { flex: 1, borderRadius: radius.card, padding: spacing(4), gap: spacing(1.5) },
  tileSolid: { backgroundColor: colors.brand600 },
  tileSoft: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tileIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileIconSolid: { backgroundColor: "rgba(255,255,255,0.2)" },
  tileIconSoft: { backgroundColor: colors.brandSoft },
  chip: { borderRadius: 999, paddingHorizontal: spacing(2), paddingVertical: spacing(0.5) },
  chipSolid: { backgroundColor: "rgba(255,255,255,0.22)" },
  chipSoft: { backgroundColor: colors.brandSoft },
  chipText: { fontSize: 11, fontWeight: "700" },
  tileValue: { fontSize: 30, fontWeight: "800", marginTop: spacing(1) },
  tileLabel: { fontSize: 13, fontWeight: "600" },
  tileTrack: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: "hidden", marginTop: spacing(1) },
  tileTrackSolid: { backgroundColor: "rgba(255,255,255,0.25)" },
  tileFill: { height: "100%", borderRadius: 3, backgroundColor: colors.brand600 },
  tileFillSolid: { backgroundColor: colors.onBrand },
  tileCaption: { fontSize: 12, color: colors.muted },
  tileCaptionSolid: { color: "rgba(255,255,255,0.85)" },
  streak: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  streakIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: `${colors.warning}22` },
  streakValue: { fontSize: 24, fontWeight: "800", color: colors.ink },
  streakUnit: { fontSize: 14, fontWeight: "600", color: colors.ink },
  streakDots: { flexDirection: "row", gap: spacing(1.5), marginVertical: spacing(1.5) },
  streakDot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track },
  streakDotOn: { backgroundColor: colors.warning },
  upsell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  upsellText: { fontSize: 14, fontWeight: "600", color: colors.ink },
}));
