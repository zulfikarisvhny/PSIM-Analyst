// lib/scouting/leagueLeaders.ts
// Server-only fetch + the stat-category catalog for the League Leaders page.
// STAT_CATEGORIES is also imported client-side (it's pure data/functions, no
// server-only imports), so the category list and each one's compute logic
// live in exactly one place.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const MIN_MINUTES = 50;

export interface LeagueLeaderRawRow {
  playerId: number;
  name: string;
  team: string;
  positionGroup: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  shots: number;
  shotsOnTargetPct: number | null;
  keyPassesPer90: number | null;
  longPassesPer90: number | null;
  crossesPer90: number | null;
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

interface RawDbRow {
  player_master_id: number;
  player_name: string;
  team: string;
  position_group: string;
  minutes_played: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  shots: number;
  shots_on_target_pct: number | null;
  key_passes_per90: number | null;
  long_passes_per90: number | null;
  crosses_per90: number | null;
  progressive_passes_per90: number | null;
  through_passes_per90: number | null;
  interceptions_per90: number | null;
  sliding_tackles_per90: number | null;
  defensive_duels_won_pct: number | null;
  aerial_duels_won_pct: number | null;
  dribbles_per90: number | null;
  successful_dribbles_pct: number | null;
  duels_won_pct: number | null;
  offensive_duels_per90: number | null;
}

const SELECT_FIELDS = [
  "player_master_id",
  "player_name",
  "team",
  "position_group",
  "minutes_played",
  "goals",
  "assists",
  "xg",
  "xa",
  "shots",
  "shots_on_target_pct",
  "key_passes_per90",
  "long_passes_per90",
  "crosses_per90",
  "progressive_passes_per90",
  "through_passes_per90",
  "interceptions_per90",
  "sliding_tackles_per90",
  "defensive_duels_won_pct",
  "aerial_duels_won_pct",
  "dribbles_per90",
  "successful_dribbles_pct",
  "duels_won_pct",
  "offensive_duels_per90",
].join(",");

export async function fetchLeagueLeaders(): Promise<LeagueLeaderRawRow[]> {
  const { data, error } = await supabase.from("mv_players_complete").select(SELECT_FIELDS).eq("league", "indonesia 1").gte("minutes_played", MIN_MINUTES);
  if (error) throw new Error(`mv_players_complete query failed: ${error.message}`);

  return ((data ?? []) as unknown as RawDbRow[])
    .filter((r) => !!r.team && !!r.player_name)
    .map((r) => ({
    playerId: r.player_master_id,
    name: r.player_name,
    team: r.team,
    positionGroup: r.position_group,
    minutesPlayed: r.minutes_played,
    goals: r.goals,
    assists: r.assists,
    xg: r.xg,
    xa: r.xa,
    shots: r.shots,
    shotsOnTargetPct: r.shots_on_target_pct,
    keyPassesPer90: r.key_passes_per90,
    longPassesPer90: r.long_passes_per90,
    crossesPer90: r.crosses_per90,
    progressivePassesPer90: r.progressive_passes_per90,
    throughPassesPer90: r.through_passes_per90,
    interceptionsPer90: r.interceptions_per90,
    slidingTacklesPer90: r.sliding_tackles_per90,
    defensiveDuelsWonPct: r.defensive_duels_won_pct,
    aerialDuelsWonPct: r.aerial_duels_won_pct,
    dribblesPer90: r.dribbles_per90,
    successfulDribblesPct: r.successful_dribbles_pct,
    duelsWonPct: r.duels_won_pct,
    offensiveDuelsPer90: r.offensive_duels_per90,
  }));
}

export type StatGroup = "Attacking" | "Passing & Creativity" | "Defending" | "Dribbling & Duels";

export interface StatCategory {
  key: string;
  label: string;
  group: StatGroup;
  decimals: number;
  suffix?: string;
  compute: (r: LeagueLeaderRawRow) => number | null;
}

/** A per-90 rate's total over the minutes actually played — matches how Wyscout's own "Top 10" counts are presented (a whole-season count, not a rate). */
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
];
