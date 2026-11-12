import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/**
 * Floating button (bottom-right, on every page) that switches between the
 * light and dark themes. Shows the theme it switches to.
 */
export function ThemeFab() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Usar tema claro" : "Usar tema escuro";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={dark}
      title={label}
      className="group fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-brand-600 pl-4 pr-4 text-white shadow-[0_8px_24px_rgba(88,8,173,0.45)] ring-4 ring-app-bg transition-all duration-200 hover:bg-brand-900 hover:pr-5 focus-visible:outline-none focus-visible:ring-brand-300-a53 sm:bottom-8 sm:right-8"
    >
      <Icon aria-hidden="true" className="size-6 transition-transform duration-300 group-hover:rotate-12" />
      <span className="hidden text-sm font-semibold sm:inline">{dark ? "Tema claro" : "Tema escuro"}</span>
    </button>
  );
}
