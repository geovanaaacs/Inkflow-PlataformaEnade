import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { setActiveTheme, type ThemeName } from "../../theme";

/*
 * Light/dark theme of the app. The choice is saved on the device; until the
 * user picks one, the app follows the system setting. Changing the theme
 * swaps the palette read by `colors`/`themed()` and the root layout remounts
 * the navigator (keyed by the theme), which keeps the current screen because
 * expo-router holds the navigation state globally.
 */

const THEME_KEY = "inkflow.theme";

interface ThemeContextValue {
  theme: ThemeName;
  /** Whether the saved choice was read (avoids a flash of the wrong theme). */
  ready: boolean;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system: ThemeName = useColorScheme() === "dark" ? "dark" : "light";
  const [saved, setSaved] = useState<ThemeName | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((value) => setSaved(value === "light" || value === "dark" ? value : null))
      .catch(() => setSaved(null))
      .finally(() => setReady(true));
  }, []);

  const theme = saved ?? system;
  // Set during render, before any child reads `colors` for this theme.
  setActiveTheme(theme);

  const setTheme = useCallback((next: ThemeName) => {
    setSaved(next);
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => {
      // Not saved: the choice still lasts until the app is closed.
    });
  }, []);

  const value = useMemo(() => ({ theme, ready, setTheme }), [theme, ready, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
