// lib/scouting/teamStyleMetrics.ts
// Client-safe: metric definitions + percentile math shared by the radar and
// scatter comparison charts on the PSIM Overview page.
import type { TeamStyleRow } from "./psimStyleStats";

export type StyleMetricKey = Exclude<keyof TeamStyleRow, "clubId" | "clubName" | "logoUrl" | "matchesPlayed" | "wins" | "draws" | "losses">;

export const STYLE_METRICS: { key: StyleMetricKey; label: string; decimals: number; suffix?: string }[] = [
  { key: "possessionPct", label: "Possession", decimals: 1, suffix: "%" },
  { key: "directPct", label: "Directness", decimals: 1, suffix: "%" },
  { key: "passAccuracyPct", label: "Pass Accuracy", decimals: 1, suffix: "%" },
  { key: "xgPerShot", label: "Shot Quality (xG/Shot)", decimals: 3 },
  { key: "proactiveDefPct", label: "Proactive Defending", decimals: 1, suffix: "%" },
  { key: "stepOutPct", label: "Step-Out Rate", decimals: 1, suffix: "%" },
  { key: "aerialPct", label: "Aerial Tendency", decimals: 1, suffix: "%" },
  { key: "finalThirdEntriesPerMatch", label: "Final Third Entries", decimals: 1 },
];

/** Share of a pool at or below `value` — a 0-100 percentile rank. */
export function percentileRank(pool: number[], value: number): number {
  if (pool.length === 0) return 50;
  const below = pool.filter((v) => v < value).length;
  const equal = pool.filter((v) => v === value).length;
  return Math.round(((below + equal / 2) / pool.length) * 1000) / 10;
}

export function metricValue(row: TeamStyleRow, key: StyleMetricKey): number | null {
  return row[key];
}
