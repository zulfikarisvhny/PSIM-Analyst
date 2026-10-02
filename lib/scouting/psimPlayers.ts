// lib/scouting/psimPlayers.ts
// Server-only (imports next/headers via createPsimServerClient) — do not
// import this from a "use client" component. Reads the PSIM project's
// `player_season_stats` table, joined to `players` (name) and `clubs` (team
// name) since player_season_stats itself only holds player_id/club_id.
import { createPsimServerClient } from "../supabase/psimServerClient";
import type { PsimPlayerRow } from "./psimPlayerTypes";

export type { PsimPlayerRow } from "./psimPlayerTypes";
export { percentileRank, getMetricValue } from "./psimPlayerTypes";

interface RawRow {
  player_id: number;
  position: string | null;
  age: number | null;
  matches_played: number | null;
  minutes_played: number | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
  stats: Record<string, unknown> | null;
  players: { name: string; photo_url: string | null } | { name: string; photo_url: string | null }[] | null;
  clubs: { name: string } | { name: string }[] | null;
}

function firstName(rel: { name: string } | { name: string }[] | null): string {
  if (!rel) return "Unknown";
  return Array.isArray(rel) ? rel[0]?.name ?? "Unknown" : rel.name;
}

function firstPlayer(rel: RawRow["players"]): { name: string; photo_url: string | null } {
  if (!rel) return { name: "Unknown", photo_url: null };
  return Array.isArray(rel) ? rel[0] ?? { name: "Unknown", photo_url: null } : rel;
}

/** Every player in the pool (all clubs) — used as the percentile-comparison denominator. */
export async function fetchPsimPlayerPool(): Promise<PsimPlayerRow[]> {
  const supabase = createPsimServerClient();
  const { data, error } = await supabase
    .from("player_season_stats")
    .select("player_id, position, age, matches_played, minutes_played, goals, assists, xg, xa, stats, players(name, photo_url), clubs(name)");
  if (error) throw new Error(`player_season_stats query failed: ${error.message}`);

  return ((data ?? []) as unknown as RawRow[]).map((row) => ({
    playerId: row.player_id,
    player: firstPlayer(row.players).name,
    team: firstName(row.clubs),
    photoUrl: firstPlayer(row.players).photo_url,
    position: row.position,
    age: row.age,
    matches_played: row.matches_played,
    minutes_played: row.minutes_played,
    goals: row.goals,
    assists: row.assists,
    xg: row.xg,
    xa: row.xa,
    stats: row.stats ?? {},
  }));
}

export async function fetchPsimClubPlayers(clubName: string): Promise<PsimPlayerRow[]> {
  const pool = await fetchPsimPlayerPool();
  return pool.filter((p) => p.team === clubName);
}
