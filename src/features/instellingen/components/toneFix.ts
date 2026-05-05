// FIX: tone typing issue

export type Tone = "error" | "info" | "success" | "warning" | "danger";

export function normalizeTone(tone: Tone): "error" | "info" | "success" | "warning" {
  if (tone === "danger") return "error";
  return tone;
}
