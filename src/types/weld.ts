export type WeldStatus = "conform" | "defect" | "gerepareerd";

export function normalizeStatus(status: string): WeldStatus {
  const s = (status || "").toLowerCase();
  if (s === "conform") return "conform";
  if (s === "defect") return "defect";
  if (s === "gerepareerd") return "gerepareerd";
  return "conform";
}
