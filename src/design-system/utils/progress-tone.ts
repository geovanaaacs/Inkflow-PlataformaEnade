export type ProgressTone = "brand" | "success" | "warning" | "danger";

/** Maps a 0–100 performance percentage to the semantic tone used in the UI. */
export function toneForPercent(percent: number): ProgressTone {
  if (percent >= 70) return "success";
  if (percent >= 40) return "warning";
  return "danger";
}
