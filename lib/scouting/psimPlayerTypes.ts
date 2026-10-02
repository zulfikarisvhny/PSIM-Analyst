// lib/scouting/psimPlayerTypes.ts
// Client-safe: the PsimPlayerRow shape plus pure functions over it. Kept
// separate from psimPlayers.ts (which imports next/headers via
// createPsimServerClient) so client components can import these without
// pulling a server-only module into the browser bundle.
export interface PsimPlayerRow {
  playerId: number;
  player: string;
  team: string;
  photoUrl: string | null;
  position: string | null;
  age: number | null;
  matches_played: number | null;
  minutes_played: number | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
  stats: Record<string, unknown>;
}

/** Reads a metric by key, checking the top-level row fields first, then the `stats` JSONB blob. */
export function getMetricValue(row: PsimPlayerRow, key: string): number | null {
  const top = (row as unknown as Record<string, unknown>)[key];
  if (typeof top === "number") return top;
  const nested = row.stats[key];
  return typeof nested === "number" ? nested : null;
}

/** Share of a pool at or below `value` — a 0-100 percentile rank. Same math as lib/scouting/players.ts. */
export function percentileRank(pool: number[], value: number): number {
  if (pool.length === 0) return 50;
  const below = pool.filter((v) => v < value).length;
  const equal = pool.filter((v) => v === value).length;
  return Math.round(((below + equal / 2) / pool.length) * 1000) / 10;
}
