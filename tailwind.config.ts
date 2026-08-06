import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#521594",
          800: "#5808ad",
          600: "#7631e2",          
          ghost: "rgba(123,69,181,0)",
          "500-a24": "rgba(118,49,226,0.24)",
          "300-a53": "rgba(225,195,255,0.53)",
          "400-a18": "rgba(133,35,238,0.18)",
          "bar-a80": "rgba(154,91,221,0.8)",
        },
        background: {
          DEFAULT: "#F8F7FF",
          card: "#FFFFFF",
          mini_card: "rgba(225, 195, 255, 0.24)"
        },
        app: {
          bg: "#f8f7ff",
          surface: "#ffffff",
        },
        ink: {
          strong: "#2c2c2a",
          muted: "#888780",
        },
        border: {
          subtle: "rgba(0,0,0,0.1)",
          navbar: "rgba(0,0,0,0.19)",
        },
        neutral: {
          quaternary: "#e5e7eb",
          "toggle-off": "#edebe9",
        },
        success: {
          DEFAULT: "#1d9e75",
        },
        danger: {
          DEFAULT: "#d43336",
          bg: "rgba(212,51,54,0.15)",
          border: "rgba(212,51,54,0.62)",
        },
        warning: {
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
