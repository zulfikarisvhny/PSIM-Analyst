// lib/scouting/leagueLeaders.ts
// Server-only. League Leaders is built from player_season_stats — the
// user's own Wyscout xlsx import (uploaded via /players/import), covering
// the whole league — not mv_players_complete ("Nexus"), a separate
// pre-aggregated dataset nothing here was ever uploaded into.
import { createPsimServerClient } from "../supabase/psimServerClient";
import type { LeagueLeaderRawRow } from "./leagueLeadersCategories";

export type { LeagueLeaderRawRow } from "./leagueLeadersCategories";

interface SeasonStatsJson {
  shots?: number | null;
  shots_on_target_pct?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  key_passes_per_90?: number | null;
  crosses_per_90?: number | null;
  long_passes_per_90?: number | null;
  progressive_passes_per_90?: number | null;
  through_passes_per_90?: number | null;
  interceptions_per_90?: number | null;
  sliding_tackles_per_90?: number | null;
  defensive_duels_won_pct?: number | null;
  aerial_duels_won_pct?: number | null;
  dribbles_per_90?: number | null;
  successful_dribbles_pct?: number | null;
  duels_won_pct?: number | null;
  offensive_duels_per_90?: number | null;
}

interface RawRow {
  player_id: number;
  club_id: number;
  position: string | null;
  age: number | null;
  matches_played: number;
  minutes_played: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  stats: SeasonStatsJson | null;
}

export async function fetchLeagueLeaders(): Promise<LeagueLeaderRawRow[]> {
  const supabase = createPsimServerClient();

  const [{ data: seasonRows, error }, { data: players }, { data: clubs }] = await Promise.all([
    supabase.from("player_season_stats").select("player_id, club_id, position, age, matches_played, minutes_played, goals, assists, xg, xa, stats"),
    supabase.from("players").select("id, name, photo_url"),
    supabase.from("clubs").select("id, name, logo_url"),
  ]);
  if (error) throw new Error(`player_season_stats query failed: ${error.message}`);

  const playerById = new Map(((players ?? []) as { id: number; name: string; photo_url: string | null }[]).map((p) => [p.id, p]));
  const clubById = new Map(((clubs ?? []) as { id: number; name: string; logo_url: string | null }[]).map((c) => [c.id, c]));

  return ((seasonRows ?? []) as RawRow[]).map((r) => {
    const p = playerById.get(r.player_id);
    const c = clubById.get(r.club_id);
    const s = r.stats ?? {};
    return {
      playerId: r.player_id,
      name: p?.name ?? `Player #${r.player_id}`,
      team: c?.name ?? "Unknown",
      logoUrl: c?.logo_url ?? null,
      photoUrl: p?.photo_url ?? null,
      position: r.position,
      age: r.age,
      matchesPlayed: r.matches_played,
      minutesPlayed: r.minutes_played,
      goals: r.goals,
      assists: r.assists,
      xg: r.xg,
      xa: r.xa,
      shots: s.shots ?? null,
      shotsOnTargetPct: s.shots_on_target_pct ?? null,
      yellowCards: s.yellow_cards ?? null,
      redCards: s.red_cards ?? null,
      keyPassesPer90: s.key_passes_per_90 ?? null,
      crossesPer90: s.crosses_per_90 ?? null,
      longPassesPer90: s.long_passes_per_90 ?? null,
      progressivePassesPer90: s.progressive_passes_per_90 ?? null,
      throughPassesPer90: s.through_passes_per_90 ?? null,
      interceptionsPer90: s.interceptions_per_90 ?? null,
      slidingTacklesPer90: s.sliding_tackles_per_90 ?? null,
      defensiveDuelsWonPct: s.defensive_duels_won_pct ?? null,
      aerialDuelsWonPct: s.aerial_duels_won_pct ?? null,
      dribblesPer90: s.dribbles_per_90 ?? null,
      successfulDribblesPct: s.successful_dribbles_pct ?? null,
      duelsWonPct: s.duels_won_pct ?? null,
      offensiveDuelsPer90: s.offensive_duels_per_90 ?? null,
    };
  });
}
