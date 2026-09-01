// lib/scouting/players.ts
import { createClient } from "@supabase/supabase-js";
import { KEY_METRICS, POSITION_DB_VALUES } from "@/lib/keyMetrics";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface NexusPlayerRow {
  player_master_id: number;
  player_name: string;
  team: string;
  position_group: string;
  position_raw: string | null;
  secondary_role: string | null;
  role_label: string | null;
  age: number | null;
  height_cm: number | null;
  foot: string | null;
  matches_played: number;
  minutes_played: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  [key: string]: unknown;
}

// The scouting page's team names (from `liga_1_2026_2027`) don't always match
// mv_players_complete's `team` column — map explicitly as new teams get wired up.
const NEXUS_TEAM_NAME: Record<string, string> = {
  "Bhayangkara Presisi FC": "Bhayangkara F.C.",
  "Persita Tangerang": "Persita",
};

/** Which KEY_METRICS bucket (e.g. "RB/LB", "CF") a raw position_group belongs to. */
export function positionBucketOf(positionGroup: string): string | null {
  for (const [bucket, values] of Object.entries(POSITION_DB_VALUES)) {
    if (values.includes(positionGroup)) return bucket;
  }
  return null;
}

/** Share of a league pool at or below `value` — a 0-100 percentile rank. */
export function percentileRank(pool: number[], value: number): number {
  if (pool.length === 0) return 50;
  const below = pool.filter((v) => v < value).length;
  const equal = pool.filter((v) => v === value).length;
  return Math.round(((below + equal / 2) / pool.length) * 1000) / 10;
}

/**
 * Weighted average of KEY_METRICS[bucket] for a player — a 0-100 "quality score".
 * KEY_METRICS mixes already-0-100 "_quality" fields with raw per90/count stats
 * (xg_per90, padj_interceptions, etc.), so each metric is first percentile-ranked
 * against `leaguePool` (same position, same-league players) before weighting —
 * otherwise a raw value like xg_per90=0.59 gets treated as "0.59 out of 100" and
 * silently craters the score for anyone whose bucket includes raw stats.
 */
export function overallQualityScore(
  player: NexusPlayerRow,
  bucket: string | null,
  leaguePool: PlayerProfileRow[]
): number | null {
  if (!bucket) return null;
  const positions = POSITION_DB_VALUES[bucket] ?? [];
  const pool = leaguePool.filter((r) => positions.includes(r.position_group));

  let weightedSum = 0;
  let weightTotal = 0;
  for (const m of KEY_METRICS[bucket]) {
    const v = player[m.key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      const poolValues = pool.map((r) => r[m.key as keyof PlayerProfileRow]).filter((x): x is number => typeof x === "number");
      weightedSum += percentileRank(poolValues, v) * m.weight;
      weightTotal += m.weight;
    }
  }
  return weightTotal > 0 ? weightedSum / weightTotal : null;
}

/** Fetch a team's current-squad player rows from mv_players_complete, deduped one row per player. */
export async function fetchTeamPlayers(teamName: string): Promise<NexusPlayerRow[]> {
  const nexusTeam = NEXUS_TEAM_NAME[teamName] ?? teamName;
  let { data, error } = await supabase.from("mv_players_complete").select("*").ilike("team", nexusTeam);
  // mv_players_complete occasionally times out on a cold query — one retry
  // is enough to ride out a transient hiccup rather than caching an empty result.
  if (error) {
    ({ data, error } = await supabase.from("mv_players_complete").select("*").ilike("team", nexusTeam));
  }
  if (error || !data) return [];

  // A handful of players have split rows (mid-season transfer/re-registration)
  // sharing the same player_master_id — keep only the highest-minutes row each.
  const byMaster = new Map<number, NexusPlayerRow>();
  for (const row of data as NexusPlayerRow[]) {
    const existing = byMaster.get(row.player_master_id);
    if (!existing || row.minutes_played > existing.minutes_played) {
      byMaster.set(row.player_master_id, row);
    }
  }
  return Array.from(byMaster.values()).sort((a, b) => b.minutes_played - a.minutes_played);
}

/** Fetch specific players by exact name, regardless of team/league — for scouting new signees from other clubs. */
export async function fetchPlayersByExactName(names: string[]): Promise<NexusPlayerRow[]> {
  if (names.length === 0) return [];
  const { data, error } = await supabase.from("mv_players_complete").select("*").in("player_name", names);
  if (error || !data) return [];

  const byMaster = new Map<number, NexusPlayerRow>();
  for (const row of data as NexusPlayerRow[]) {
    const existing = byMaster.get(row.player_master_id);
    if (!existing || row.minutes_played > existing.minutes_played) {
      byMaster.set(row.player_master_id, row);
    }
  }
  return Array.from(byMaster.values());
}

export interface PositionAverages {
  padj_interceptions: number;
  fouls_per90: number;
  accurate_passes_pct: number;
  passes_quality: number;
  long_passes_per90: number;
  accurate_long_passes_pct: number;
  touches_in_box_per90: number;
  finishing_efficiency: number;
  dribbles_per90: number;
  xa_per90: number;
  received_long_passes_per90: number;
  successful_dribbles_pct: number;
}

const AVERAGE_FIELDS: (keyof PositionAverages)[] = [
  "padj_interceptions",
  "fouls_per90",
  "accurate_passes_pct",
  "passes_quality",
  "long_passes_per90",
  "accurate_long_passes_pct",
  "touches_in_box_per90",
  "finishing_efficiency",
  "dribbles_per90",
  "xa_per90",
  "received_long_passes_per90",
  "successful_dribbles_pct",
];

/**
 * League-wide per-position_group averages (min. 300 minutes played, to match
 * the "regular" threshold used for the team breakdown), for team-vs-league
 * comparisons in the Player Stats overview.
 */
export async function fetchLeaguePositionAverages(): Promise<Record<string, PositionAverages>> {
  const { data, error } = await supabase
    .from("mv_players_complete")
    .select(["position_group", ...AVERAGE_FIELDS].join(","))
    .eq("league", "indonesia 1")
    .gte("minutes_played", 300);
  if (error || !data) return {};

  const byPos = new Map<string, Record<string, unknown>[]>();
  for (const row of data as unknown as Record<string, unknown>[]) {
    const pos = row.position_group as string;
    const bucket = byPos.get(pos) ?? [];
    bucket.push(row);
    byPos.set(pos, bucket);
  }

  const avg = (rows: Record<string, unknown>[], key: string) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const result: Record<string, PositionAverages> = {};
  for (const [pos, rows] of byPos.entries()) {
    result[pos] = Object.fromEntries(AVERAGE_FIELDS.map((f) => [f, avg(rows, f)])) as unknown as PositionAverages;
  }
  return result;
}

// Field set mirrors KEY_METRICS' per-position metrics (lib/keyMetrics.ts), with
// 3 corrected column names that don't actually exist in mv_players_complete as
// spelled there (passes_to_final_third -> _quality, received_passes -> _per90,
// progressive_passes -> _per90).
export interface PlayerProfileRow {
  position_group: string;
  padj_interceptions: number;
  defensive_duels_quality: number;
  aerial_quality: number;
  progressive_passes_quality: number;
  passes_quality: number;
  defensive_activity: number;
  long_passes_quality: number;
  crosses_quality: number;
  carrying_quality: number;
  passes_to_final_third_quality: number;
  xa_per90: number;
  dribbles_quality: number;
  forward_passes_quality: number;
  received_passes_per90: number;
  progressive_passes_per90: number;
  creativity_quality: number;
  shot_assists_per90: number;
  finishing_efficiency: number;
  xg_per90: number;
  smart_passes_quality: number;
  offensive_duels_quality: number;
  goals_per90: number;
  shots_quality: number;
  touches_in_box_per90: number;
  long_passes_per90: number;
  accurate_long_passes_pct: number;
  fouls_per90: number;
  accurate_passes_pct: number;
  // GK
  prevented_goals_per90: number;
  shot_stopping_quality: number;
  aerial_ability_gk: number;
  exits_per90: number;
  back_passes_received_as_gk_per90: number;
}

export const PLAYER_PROFILE_FIELDS: (keyof Omit<PlayerProfileRow, "position_group">)[] = [
  "padj_interceptions",
  "defensive_duels_quality",
  "aerial_quality",
  "progressive_passes_quality",
  "passes_quality",
  "defensive_activity",
  "long_passes_quality",
  "crosses_quality",
  "carrying_quality",
  "passes_to_final_third_quality",
  "xa_per90",
  "dribbles_quality",
  "forward_passes_quality",
  "received_passes_per90",
  "progressive_passes_per90",
  "creativity_quality",
  "shot_assists_per90",
  "finishing_efficiency",
  "xg_per90",
  "smart_passes_quality",
  "offensive_duels_quality",
  "goals_per90",
  "shots_quality",
  "touches_in_box_per90",
  "long_passes_per90",
  "accurate_long_passes_pct",
  "fouls_per90",
  "accurate_passes_pct",
  "prevented_goals_per90",
  "shot_stopping_quality",
  "aerial_ability_gk",
  "exits_per90",
  "back_passes_received_as_gk_per90",
];

/**
 * League-wide outfield player rows (min. 300 minutes) for the position-profile
 * radar — used purely as the percentile-rank comparison pool per position_group,
 * not displayed row-by-row.
 */
export async function fetchLeaguePlayerProfilePool(): Promise<PlayerProfileRow[]> {
  const { data, error } = await supabase
    .from("mv_players_complete")
    .select(["position_group", ...PLAYER_PROFILE_FIELDS].join(","))
    .eq("league", "indonesia 1")
    .in("position_group", ["GK", "CB", "RB", "LB", "CM", "DM", "AM", "RW", "LW", "CF"])
    .gte("minutes_played", 300);
  if (error || !data) return [];
  return data as unknown as PlayerProfileRow[];
}
