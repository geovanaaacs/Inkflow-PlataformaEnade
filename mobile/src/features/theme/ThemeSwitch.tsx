import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Card } from "../../components/ui";
import { colors, spacing, themed } from "../../theme";
import { useTheme } from "./ThemeProvider";

/** "Tema escuro" row of the account screens. */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <Card>
      <View style={styles.row}>
        <Ionicons name={dark ? "moon" : "sunny"} size={22} color={colors.brandText} />
        <View style={styles.texts}>
          <Text style={styles.title}>Tema escuro</Text>
          <Text style={styles.muted}>{dark ? "Ativado" : "Desativado"}</Text>
        </View>
        <Switch
          value={dark}
          onValueChange={(on) => setTheme(on ? "dark" : "light")}
          trackColor={{ false: colors.track, true: colors.brand600 }}
          thumbColor={colors.onBrand}
          accessibilityLabel="Tema escuro"
        />
      </View>
    </Card>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  texts: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
}));
