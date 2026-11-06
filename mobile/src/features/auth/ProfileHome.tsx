import { StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, Screen, Subtitle, Title } from "../../components/ui";
import { colors, radius, spacing } from "../../theme";
import { useAuth } from "./AuthProvider";
import type { PlanId, UserRole } from "./api";

const ROLE_LABEL: Record<UserRole, string> = { aluno: "Aluno", professor: "Professor", admin: "Administrador" };
const PLAN_LABEL: Record<PlanId, string> = { basico: "Básico", avancado: "Avançado", premium: "Premium" };

/**
 * Temporary home of each profile (phase 2): confirms the session and lists
 * what the next phases bring to this profile.
 */
export function ProfileHome({ upcoming }: { upcoming: string[] }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const firstName = user.name.split(" ")[0];

  return (
    <Screen>
      <Brand />
      <Title>Olá, {firstName}!</Title>
      <View style={styles.badges}>
        <Text style={styles.badge}>{ROLE_LABEL[user.role]}</Text>
        {user.plan && <Text style={styles.badge}>Plano {PLAN_LABEL[user.plan]}</Text>}
      </View>
      <Subtitle>{user.email}</Subtitle>

      <Card>
        <Text style={styles.cardTitle}>Em breve no app</Text>
        {upcoming.map((item) => (
          <Text key={item} style={styles.item}>
            • {item}
          </Text>
        ))}
      </Card>

      <Button label="Sair" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: spacing(2) },
  badge: {
    overflow: "hidden",
    backgroundColor: colors.brandSoft,
    color: colors.brand800,
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radius.badge,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  item: { fontSize: 15, color: colors.ink, lineHeight: 22 },
});
