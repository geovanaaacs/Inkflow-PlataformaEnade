import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "../../components/feedback";
import { Avatar, Button, Card, Screen, Title } from "../../components/ui";
import { ThemeSwitch } from "../theme/ThemeSwitch";
import { colors, spacing, themed } from "../../theme";
import { useAuth } from "./AuthProvider";

/** "Conta" tab of the staff profiles: who is logged in, a note about the profile, logout. */
export function AccountScreen({ roleLabel, note }: { roleLabel: string; note?: string }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Screen edges={["top", "left", "right"]}>
      <Title>Minha conta</Title>
      <Card>
        <View style={styles.header}>
          <Avatar name={user.name} photoUrl={user.photoUrl} size={64} />
          <View style={styles.flex}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.muted}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          <Badge>{roleLabel}</Badge>
        </View>
        {note ? <Text style={styles.muted}>{note}</Text> : null}
      </Card>
      <Button label="Editar perfil" icon="person-outline" variant="secondary" onPress={() => router.push(`/${user.role}/perfil`)} />
      {(user.role === "professor" || user.role === "admin") && (
        <Button label="Ver planos" variant="secondary" onPress={() => router.push(`/${user.role}/planos`)} />
      )}
      <ThemeSwitch />
      <Button label="Sair" variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  badges: { flexDirection: "row", gap: spacing(2) },
  header: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  flex: { flex: 1 },
}));
