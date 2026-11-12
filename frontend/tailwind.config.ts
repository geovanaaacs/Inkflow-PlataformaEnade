import type { Config } from "tailwindcss";

/**
 * Theme-dependent colors are CSS variables (src/index.css: :root = light,
 * .dark = dark), as "R G B" channels so opacity modifiers like /40 still work.
 */
const themed = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#521594",
          800: "#5808ad",
          600: "#7631e2",
          /** Brand-colored text on the page background (lighter in the dark theme). */
          ink: themed("brand-ink"),
          ghost: "rgba(123,69,181,0)",
          "500-a24": "rgba(118,49,226,0.24)",
          "300-a53": "rgb(var(--brand-tint) / calc(<alpha-value> * var(--brand-tint-alpha)))",
          "400-a18": "rgba(133,35,238,0.18)",
          "bar-a80": "rgba(154,91,221,0.8)",
        },
        background: {
          DEFAULT: themed("app-bg"),
          card: themed("app-surface"),
          mini_card: "var(--mini-card)",
        },
        app: {
          bg: themed("app-bg"),
          surface: themed("app-surface"),
        },
        ink: {
          strong: themed("ink-strong"),
          muted: themed("ink-muted"),
        },
        border: {
          subtle: "var(--border-subtle)",
          navbar: "var(--border-navbar)",
        },
        /** Translucent layer for hover states, dividers and soft fills: black on light, white on dark. */
        overlay: themed("overlay"),
        neutral: {
          quaternary: themed("track"),
          "toggle-off": themed("toggle-off"),
        },
        success: {
          /** Text color on light/dark backgrounds (DEFAULT is for fills). */
          ink: themed("success-ink"),
          DEFAULT: "#1d9e75",
        },
        danger: {
          /** Text color on light/dark backgrounds (DEFAULT is for fills). */
          ink: themed("danger-ink"),
          DEFAULT: "#d43336",
          bg: "rgba(212,51,54,0.15)",
          border: "rgba(212,51,54,0.62)",
        },
        warning: {
          /** Text color on light/dark backgrounds (DEFAULT is for fills). */
          ink: themed("warning-ink"),
          DEFAULT: "#f2994a",
        },
      },
      fontFamily: {
        sans: [
          "DM Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        button: "10px",
        input: "16px",
        card: "20px",
        dropdown: "8px",
        badge: "12px",
      },
      boxShadow: {
        card: "0px 4px 2px 0px rgba(0,0,0,0.25)",
        input: "0px 1px 5px 0px rgba(0,0,0,0.25)",
      },
      maxWidth: {
        content: "1160px",
      },
      spacing: {
        4.5: "1.125rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
