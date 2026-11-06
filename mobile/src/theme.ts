/** Design tokens — same values as frontend/tailwind.config.ts. */
export const colors = {
  brand900: "#521594",
  brand800: "#5808ad",
  brand600: "#7631e2",
  brandSoft: "rgba(225,195,255,0.24)",
  background: "#f8f7ff",
  surface: "#ffffff",
  ink: "#2c2c2a",
  muted: "#888780",
  border: "rgba(0,0,0,0.1)",
  success: "#1d9e75",
  danger: "#d43336",
  dangerBg: "rgba(212,51,54,0.15)",
  warning: "#f2994a",
} as const;

export const radius = {
  button: 10,
  input: 16,
  card: 20,
  badge: 12,
} as const;

export const spacing = (units: number) => units * 4;
