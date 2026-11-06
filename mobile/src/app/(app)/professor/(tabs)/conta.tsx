import { StyleSheet, Text, View } from "react-native";
import { Badge } from "../../../../components/feedback";
import { Button, Card, Screen, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { colors, spacing } from "../../../../theme";

/** Account tab: who is logged in and logout. */
export default function TeacherAccountScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Screen edges={["top", "left", "right"]}>
      <Title>Minha conta</Title>
      <Card>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.muted}>{user.email}</Text>
        <View style={styles.badges}>
          <Badge>Professor</Badge>
        </View>
        <Text style={styles.muted}>
          Suas respostas nas questões são gravadas, mas não entram no ranking nem nas estatísticas dos alunos.
        </Text>
      </Card>
      <Button label="Sair" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  badges: { flexDirection: "row", gap: spacing(2) },
});
