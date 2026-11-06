import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { PlanId } from "../features/auth/api";
import { errorMessage } from "../lib/format";
import { FEATURE_MIN_PLAN, PLAN_LABEL, type DailyUsage, type FeatureKey } from "../lib/plan-access";
import { colors, radius, spacing } from "../theme";
import { Button } from "./ui";

export type Tone = "brand" | "success" | "warning" | "danger";

const TONE_COLOR: Record<Tone, string> = {
  brand: colors.brand600,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

/** Same thresholds as the web (design-system/utils/progress-tone.ts). */
export function toneForPercent(percent: number): Tone {
  if (percent >= 70) return "success";
  if (percent >= 40) return "warning";
  return "danger";
}

export function ProgressBar({ value, tone = "brand", label }: { value: number; tone?: Tone; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: TONE_COLOR[tone] }]} />
    </View>
  );
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${TONE_COLOR[tone]}22` }]}>
      <Text style={[styles.badgeText, { color: TONE_COLOR[tone] }]}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Loading spinner, error with "Tentar novamente", or nothing. */
export function LoadState({
  loading,
  error,
  onRetry,
  fallback,
}: {
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
  fallback: string;
}) {
  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.brand600} size="large" />
      </View>
    );
  }
  if (!error) return null;
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{errorMessage(error, fallback)}</Text>
      {onRetry && <Button label="Tentar novamente" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

/** Plan status: daily usage dots on the free plan, "ilimitadas" on paid plans. */
export function PlanBanner({ planId, usage }: { planId: PlanId; usage: DailyUsage }) {
  const planName = `Plano ${PLAN_LABEL[planId]}${planId === "basico" ? " (gratuito)" : ""}`;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>{planName}</Text>
      {usage.limit === null ? (
        <Text style={styles.bannerText}>
          Questões ilimitadas · {usage.used} {usage.used === 1 ? "respondida" : "respondidas"} hoje
        </Text>
      ) : (
        <View
          style={styles.dotsRow}
          accessible
          accessibilityLabel={`${usage.used} de ${usage.limit} questões gratuitas usadas hoje`}
        >
          <View style={styles.dots}>
            {Array.from({ length: usage.limit }, (_, index) => (
              <View key={index} style={[styles.dot, index < usage.used && styles.dotFilled]} />
            ))}
          </View>
          <Text style={styles.bannerText}>
            {Math.min(usage.used, usage.limit)}/{usage.limit} hoje
          </Text>
        </View>
      )}
      <Text style={styles.bannerLink} accessibilityRole="link" onPress={() => router.push("/aluno/planos")}>
        {planId === "basico" ? "Faça upgrade para ilimitado →" : planId === "avancado" ? "Conheça o Premium →" : "Acesso completo · Ver planos →"}
      </Text>
    </View>
  );
}

/** A feature the plan doesn't include: what it is and how to unlock it. */
export function LockedFeature({ feature, label, description }: { feature: FeatureKey; label: string; description: string }) {
  const plan = PLAN_LABEL[FEATURE_MIN_PLAN[feature]];
  return (
    <View style={styles.locked}>
      <Text style={styles.lockedTitle}>🔒 {label}</Text>
      <Text style={styles.lockedText}>{description}</Text>
      <Text style={styles.lockedPlan}>Disponível a partir do plano {plan}.</Text>
      <Button label="Ver planos" onPress={() => router.push("/aluno/planos")} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.07)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  badge: { alignSelf: "flex-start", borderRadius: radius.badge, paddingHorizontal: spacing(2.5), paddingVertical: spacing(1) },
  badgeText: { fontSize: 12, fontWeight: "700" },
  section: { gap: spacing(1) },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  sectionSubtitle: { fontSize: 14, color: colors.muted },
  state: { alignItems: "center", justifyContent: "center", paddingVertical: spacing(10), gap: spacing(4) },
  stateText: { fontSize: 15, color: colors.muted, textAlign: "center" },
  banner: { backgroundColor: colors.brand800, borderRadius: radius.card, padding: spacing(4), gap: spacing(2) },
  bannerTitle: { color: colors.surface, fontSize: 15, fontWeight: "700" },
  bannerText: { color: colors.surface, fontSize: 14 },
  bannerLink: { color: colors.surface, fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: spacing(3), flexWrap: "wrap" },
  dots: { flexDirection: "row", gap: spacing(1.5) },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.surface },
  dotFilled: { backgroundColor: colors.surface },
  locked: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: spacing(4),
    gap: spacing(2),
  },
  lockedTitle: { fontSize: 16, fontWeight: "700", color: colors.brand900 },
  lockedText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  lockedPlan: { fontSize: 13, color: colors.brand800, fontWeight: "600" },
});
