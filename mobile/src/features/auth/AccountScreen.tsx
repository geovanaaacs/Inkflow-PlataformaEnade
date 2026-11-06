import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "../../components/feedback";
import { Button, Card, Screen, Title } from "../../components/ui";
import { colors, spacing } from "../../theme";
import { useAuth } from "./AuthProvider";

/** "Conta" tab of the staff profiles: who is logged in, a note about the profile, logout. */
export function AccountScreen({ roleLabel, note }: { roleLabel: string; note?: string }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Screen edges={["top", "left", "right"]}>
      <Title>Minha conta</Title>
      <Card>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.muted}>{user.email}</Text>
        <View style={styles.badges}>
          <Badge>{roleLabel}</Badge>
        </View>
        {note ? <Text style={styles.muted}>{note}</Text> : null}
      </Card>
      {(user.role === "professor" || user.role === "admin") && (
        <Button label="Ver planos" variant="secondary" onPress={() => router.push(`/${user.role}/planos`)} />
      )}
      <Button label="Sair" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  badges: { flexDirection: "row", gap: spacing(2) },
});
