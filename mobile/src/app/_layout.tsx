import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ThemeProvider, useTheme } from "../features/theme/ThemeProvider";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { theme, ready } = useTheme();
  // Wait for the saved choice so the app doesn't open in the wrong theme.
  if (!ready) return null;

  const base = theme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.brand600, background: colors.background, card: colors.surface, text: colors.ink, border: colors.border },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      {/* New key on theme change: every screen re-renders with the new palette (the navigation state is kept). */}
      <Stack key={theme} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </NavigationThemeProvider>
  );
}
