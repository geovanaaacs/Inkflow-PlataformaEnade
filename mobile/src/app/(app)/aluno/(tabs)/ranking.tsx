import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LoadState, LockedFeature } from "../../../../components/feedback";
import { Card, Screen, Segmented, Subtitle, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { getRanking, type RankingEntry, type RankingScope } from "../../../../features/dashboard/api";
import { userHasFeature } from "../../../../lib/plan-access";
import { useAsync } from "../../../../lib/useAsync";
import { colors, radius, spacing } from "../../../../theme";

const SCOPES: { value: RankingScope; label: string }[] = [
  { value: "geral", label: "Geral" },
  { value: "simulados", label: "Simulados" },
];

/** Same rules shown on the web (dashboard/components/RankingCard.tsx). */
const RULES: Record<RankingScope, string> = {
  geral:
    "Cada questão respondida na aba Questões soma pontos: acerto vale 10 pts e erro vale 2 pts. Conta só a 1ª tentativa de cada questão. Aberto a todos os planos.",
  simulados:
    "Para cada simulado finalizado vale a sua melhor tentativa: cada acerto soma 10 pts. Incluído no plano Premium.",
};

export default function RankingScreen() {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScope>("geral");
  const locked = scope === "simulados" && !userHasFeature(user, "mockExamRanking");

  return (
    <Screen edges={["top", "left", "right"]}>
      <Title>Ranking</Title>
      <Subtitle>Acompanhe sua posição nas questões e nos simulados.</Subtitle>
      <Segmented options={SCOPES} value={scope} onChange={setScope} />
      <Text style={styles.rule}>{RULES[scope]}</Text>
      {locked ? (
        <LockedFeature
          feature="mockExamRanking"
          label="Ranking dos Simulados"
          description="Acompanhe sua evolução nos simulados e veja sua posição no ranking."
        />
      ) : (
        <Board key={scope} scope={scope} />
      )}
    </Screen>
  );
}

function Board({ scope }: { scope: RankingScope }) {
  // Reloads when the tab comes back into focus: the points change with every answer.
  const ranking = useAsync(() => getRanking(scope), [scope], { reloadOnFocus: true });
  const data = ranking.data;
  if (!data) {
    return <LoadState loading={ranking.loading} error={ranking.error} onRetry={ranking.reload} fallback="Não foi possível carregar o ranking." />;
  }

  const me = data.currentUser;
  const meOutsideTop = me !== null && !data.top.some((entry) => entry.isCurrentUser);

  return (
    <>
      <Card>
        {me ? (
          <View style={styles.me}>
            <Text style={styles.muted}>Sua posição</Text>
            <Text style={styles.position}>{me.position}º</Text>
            <Text style={styles.body}>
              de {data.totalParticipants} estudantes · {me.points} pts
            </Text>
            <Text style={styles.muted}>{me.detail}</Text>
          </View>
        ) : (
          <Text style={[styles.muted, styles.center]}>
            {scope === "simulados" ? "Finalize um simulado para entrar neste ranking." : "Responda questões para entrar no ranking."}
          </Text>
        )}
      </Card>
      <View style={styles.list} accessibilityLabel="Primeiros colocados">
        {data.top.map((entry) => (
          <Row key={entry.id} entry={entry} />
        ))}
        {meOutsideTop && me && (
          <>
            <Text style={[styles.muted, styles.center]}>⋯</Text>
            <Row entry={me} />
          </>
        )}
      </View>
    </>
  );
}

function Row({ entry }: { entry: RankingEntry }) {
  const podium = entry.position <= 3;
  return (
    <View style={[styles.row, entry.isCurrentUser && styles.rowMe]}>
      <View style={[styles.place, podium && styles.placePodium]}>
        <Text style={[styles.placeText, podium && styles.placeTextPodium]}>{entry.position === 1 ? "👑" : entry.position}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.name, entry.isCurrentUser && styles.bold]} numberOfLines={1}>
          {entry.name}
          {entry.isCurrentUser ? " (você)" : ""}
        </Text>
        <Text style={styles.small}>{entry.detail}</Text>
      </View>
      <Text style={styles.points}>{entry.points} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rule: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  me: { alignItems: "center", gap: spacing(1) },
  position: { fontSize: 40, fontWeight: "800", color: colors.brand800 },
  body: { fontSize: 14, color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  center: { textAlign: "center" },
  list: { gap: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  rowMe: { backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brand600 },
  place: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" },
  placePodium: { backgroundColor: colors.brand800 },
  placeText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  placeTextPodium: { color: colors.surface },
  name: { fontSize: 15, color: colors.ink },
  bold: { fontWeight: "700" },
  small: { fontSize: 12, color: colors.muted },
  points: { fontSize: 14, color: colors.muted, fontWeight: "600" },
});
