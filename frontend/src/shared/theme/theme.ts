export type Theme = "light" | "dark";

/** localStorage key; also read by the inline script in index.html (keep in sync). */
export const THEME_STORAGE_KEY = "inkflow-theme";

const THEME_COLOR: Record<Theme, string> = { light: "#f8f7ff", dark: "#14121b" };

/** Saved choice, or the system preference when the user never picked one. */
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage blocked (private mode, disabled cookies): fall back to the system.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies the theme to <html> (Tailwind's `dark` class) and to the browser UI color. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not saved: the choice still lasts for this visit.
  }
}
