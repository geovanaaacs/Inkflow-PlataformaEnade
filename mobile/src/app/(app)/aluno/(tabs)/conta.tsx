import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "../../../../components/feedback";
import { Button, Card, Screen, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { PLAN_LABEL } from "../../../../lib/plan-access";
import { ThemeSwitch } from "../../../../features/theme/ThemeSwitch";
import { colors, spacing, themed } from "../../../../theme";

/** Account tab: who is logged in, plan, notes and logout. */
export default function AccountScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Screen edges={["top", "left", "right"]}>
      <Title>Minha conta</Title>
      <Card>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.muted}>{user.email}</Text>
        {user.course && <Text style={styles.muted}>{user.course}</Text>}
        <View style={styles.badges}>
          <Badge>Aluno</Badge>
          {user.plan && <Badge tone="success">Plano {PLAN_LABEL[user.plan]}</Badge>}
        </View>
      </Card>
      <Button label="Planos" onPress={() => router.push("/aluno/planos")} />
      <Button label="Minhas anotações" variant="secondary" onPress={() => router.push("/aluno/anotacoes")} />
      <Button label="Mentoria e grupos de estudo" variant="secondary" onPress={() => router.push("/aluno/mentoria")} />
      <ThemeSwitch />
      <Button label="Sair" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  badges: { flexDirection: "row", gap: spacing(2) },
}));
