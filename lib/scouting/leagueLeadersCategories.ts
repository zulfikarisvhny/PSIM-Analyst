// lib/scouting/leagueLeadersCategories.ts
// Client-safe: the row shape and the stat-category catalog for League
// Leaders, with no server-only imports — leagueLeaders.ts (the actual
// Supabase fetch, which needs next/headers) stays separate so the client
// board component doesn't drag a server-only module into its bundle.
export interface LeagueLeaderRawRow {
  playerId: number;
  name: string;
  team: string;
  logoUrl: string | null;
  photoUrl: string | null;
  position: string | null;
  age: number | null;
  matchesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  shots: number | null;
  shotsOnTargetPct: number | null;
  yellowCards: number | null;
  redCards: number | null;
  keyPassesPer90: number | null;
  crossesPer90: number | null;
  longPassesPer90: number | null;
  progressivePassesPer90: number | null;
  throughPassesPer90: number | null;
  interceptionsPer90: number | null;
  slidingTacklesPer90: number | null;
  defensiveDuelsWonPct: number | null;
  aerialDuelsWonPct: number | null;
  dribblesPer90: number | null;
  successfulDribblesPct: number | null;
  duelsWonPct: number | null;
  offensiveDuelsPer90: number | null;
}

export type StatGroup = "Attacking" | "Passing & Creativity" | "Defending" | "Dribbling & Duels" | "Discipline";

export interface StatCategory {
  key: string;
  label: string;
  group: StatGroup;
  decimals: number;
  suffix?: string;
  compute: (r: LeagueLeaderRawRow) => number | null;
}

/** A per-90 rate's total over the minutes actually played — matches how these are normally reported as a season count, not a rate. */
function toTotal(per90: number | null, minutes: number): number | null {
  if (per90 === null) return null;
  return Math.round((per90 * minutes) / 90);
}

export const STAT_CATEGORIES: StatCategory[] = [
  { key: "goals", label: "Goals", group: "Attacking", decimals: 0, compute: (r) => r.goals },
  { key: "assists", label: "Assists", group: "Attacking", decimals: 0, compute: (r) => r.assists },
  { key: "xg", label: "xG", group: "Attacking", decimals: 2, compute: (r) => r.xg },
  { key: "xa", label: "xA", group: "Attacking", decimals: 2, compute: (r) => r.xa },
  { key: "shots", label: "Shots", group: "Attacking", decimals: 0, compute: (r) => r.shots },
  { key: "shots_on_target_pct", label: "Shots on Target %", group: "Attacking", decimals: 1, suffix: "%", compute: (r) => r.shotsOnTargetPct },

  { key: "key_passes", label: "Key Passes", group: "Passing & Creativity", decimals: 0, compute: (r) => toTotal(r.keyPassesPer90, r.minutesPlayed) },
  { key: "long_balls", label: "Long Balls", group: "Passing & Creativity", decimals: 0, compute: (r) => toTotal(r.longPassesPer90, r.minutesPlayed) },
  { key: "crosses", label: "Crosses", group: "Passing & Creativity", decimals: 0, compute: (r) => toTotal(r.crossesPer90, r.minutesPlayed) },
  { key: "progressive_passes", label: "Progressive Passes", group: "Passing & Creativity", decimals: 0, compute: (r) => toTotal(r.progressivePassesPer90, r.minutesPlayed) },
  { key: "through_passes", label: "Through Passes", group: "Passing & Creativity", decimals: 0, compute: (r) => toTotal(r.throughPassesPer90, r.minutesPlayed) },

  { key: "interceptions", label: "Interceptions", group: "Defending", decimals: 0, compute: (r) => toTotal(r.interceptionsPer90, r.minutesPlayed) },
  { key: "sliding_tackles", label: "Tackles", group: "Defending", decimals: 0, compute: (r) => toTotal(r.slidingTacklesPer90, r.minutesPlayed) },
  { key: "defensive_duels_won_pct", label: "Defensive Duels Won %", group: "Defending", decimals: 1, suffix: "%", compute: (r) => r.defensiveDuelsWonPct },
  { key: "aerial_duels_won_pct", label: "Aerial Duels Won %", group: "Defending", decimals: 1, suffix: "%", compute: (r) => r.aerialDuelsWonPct },

  { key: "dribbles", label: "Dribbles", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.dribblesPer90, r.minutesPlayed) },
  { key: "successful_dribbles_pct", label: "Successful Dribbles %", group: "Dribbling & Duels", decimals: 1, suffix: "%", compute: (r) => r.successfulDribblesPct },
  { key: "duels_won_pct", label: "Duels Won %", group: "Dribbling & Duels", decimals: 1, suffix: "%", compute: (r) => r.duelsWonPct },
  { key: "offensive_duels", label: "Offensive Duels", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.offensiveDuelsPer90, r.minutesPlayed) },

  { key: "yellow_cards", label: "Yellow Cards", group: "Discipline", decimals: 0, compute: (r) => r.yellowCards },
  { key: "red_cards", label: "Red Cards", group: "Discipline", decimals: 0, compute: (r) => r.redCards },
];
