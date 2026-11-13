/**
 * Design tokens — same values as the site (frontend/tailwind.config.ts and
 * src/index.css), in a light and a dark palette.
 *
 * `colors` always returns the active palette, and `themed()` builds a
 * stylesheet once per theme, so screens keep writing `colors.ink` and
 * `styles.title`. ThemeProvider switches the palette and re-renders the app.
 */

export type ThemeName = "light" | "dark";

export interface Palette {
  brand900: string;
  brand800: string;
  brand600: string;
  /** Brand-colored text and icons on the page background (lighter in the dark theme). */
  brandText: string;
  brandSoft: string;
  /** Text and icons on top of brand-colored backgrounds. */
  onBrand: string;
  background: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  /** Neutral track/fill (progress bars, ranking places). */
  track: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
}

export const palettes: Record<ThemeName, Palette> = {
  light: {
    brand900: "#521594",
    brand800: "#5808ad",
    brand600: "#7631e2",
    brandText: "#5808ad",
    brandSoft: "rgba(225,195,255,0.24)",
    onBrand: "#ffffff",
    background: "#f8f7ff",
    surface: "#ffffff",
    ink: "#2c2c2a",
    muted: "#888780",
    border: "rgba(0,0,0,0.1)",
    track: "rgba(0,0,0,0.07)",
    success: "#1d9e75",
    successBg: "rgba(29,158,117,0.14)",
    danger: "#d43336",
    dangerBg: "rgba(212,51,54,0.15)",
    warning: "#f2994a",
  },
  dark: {
    brand900: "#521594",
    brand800: "#5808ad",
    brand600: "#8448ee",
    brandText: "#c9a7ff",
    brandSoft: "rgba(150,100,235,0.18)",
    onBrand: "#ffffff",
    background: "#14121b",
    surface: "#1f1c29",
    ink: "#eceaf2",
    muted: "#a3a0b0",
    border: "rgba(255,255,255,0.12)",
    track: "rgba(255,255,255,0.1)",
    success: "#2bb98c",
    successBg: "rgba(43,185,140,0.18)",
    danger: "#e5585b",
    dangerBg: "rgba(229,88,91,0.18)",
    warning: "#f2994a",
  },
};

let activeTheme: ThemeName = "light";

export function getActiveTheme(): ThemeName {
  return activeTheme;
}

/** Called by ThemeProvider before it re-renders the app. */
export function setActiveTheme(theme: ThemeName): void {
  activeTheme = theme;
}

/** Live view of the active palette: `colors.ink` is read at render time. */
export const colors = {} as Palette;
for (const key of Object.keys(palettes.light) as (keyof Palette)[]) {
  Object.defineProperty(colors, key, { enumerable: true, get: () => palettes[activeTheme][key] });
}

/**
 * Stylesheet that follows the theme: `const styles = themed(() => StyleSheet.create({...}))`.
 * The factory runs once per theme (lazily), reading `colors` of that theme.
 */
export function themed<T extends object>(factory: () => T): T {
  const cache: Partial<Record<ThemeName, T>> = {};
  const current = () => (cache[activeTheme] ??= factory());
  return new Proxy({} as T, {
    get: (_target, key) => current()[key as keyof T],
    has: (_target, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(current(), key);
      return descriptor && { ...descriptor, configurable: true };
    },
  });
}

export const radius = {
  button: 10,
  input: 16,
  card: 20,
  badge: 12,
} as const;

export const spacing = (units: number) => units * 4;
