/**
 * Shared date formatting utilities for CaseManagement.ai
 * Use these everywhere instead of rendering raw ISO strings or Firestore timestamps.
 */

/**
 * Formats an ISO date string or timestamp to a long human-readable date+time.
 * e.g. "May 23, 2026 · 1:12 PM"
 */
export function formatDateTime(value: string | Date | { toDate?: () => Date } | null | undefined): string {
  if (!value) return "—";
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "object" && typeof (value as any).toDate === "function") {
    d = (value as any).toDate();
  } else {
    d = new Date(value as string);
  }
  if (isNaN(d.getTime())) return String(value);
  return (
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

/**
 * Formats an ISO date string to a short readable date.
 * e.g. "May 23, 2026"
 */
export function formatDate(value: string | Date | { toDate?: () => Date } | null | undefined): string {
  if (!value) return "—";
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "object" && typeof (value as any).toDate === "function") {
    d = (value as any).toDate();
  } else {
    d = new Date(value as string);
  }
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Returns a risk label string for a given risk score.
 * 0–30 → "Low Risk", 31–70 → "Moderate Risk", 71+ → "High Risk"
 */
export function getRiskLabel(score: number | undefined | null): string {
  if (score == null) return "";
  if (score <= 30) return "Low Risk";
  if (score <= 70) return "Moderate Risk";
  return "High Risk";
}

/**
 * Derives a dynamic donut chart color based on percentage.
 * ≥80% → green, ≥50% → yellow, else → red (including 0%)
 */
export function donutColor(pct: number): string {
  if (pct >= 80) return "hsl(160,84%,39%)";   // icm-green
  if (pct >= 50) return "hsl(38,92%,50%)";     // icm-amber
  return "hsl(0,74%,50%)";                     // icm-red — covers both 0% and low
}
