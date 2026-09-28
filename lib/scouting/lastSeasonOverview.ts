// lib/scouting/lastSeasonOverview.ts
// Server-only. Reads last_season_overview — one row per club, the prior
// season's full-season summary (goals for/against, xG, possession, pass
// accuracy, ...), used to compare PSIM's current form against last season.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface LastSeasonOverview {
  season: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgXg: number | null;
  possessionPct: number | null;
  passAccuracyPct: number | null;
}

export async function fetchLastSeasonOverview(clubName: string): Promise<LastSeasonOverview | null> {
  const supabase = createPsimServerClient();
  const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
  if (!club) return null;

  const { data, error } = await supabase
    .from("last_season_overview")
    .select("season, matches_played, wins, draws, losses, goals_for, goals_against, avg_xg, possession_pct, pass_accuracy_pct")
    .eq("club_id", club.id)
    .maybeSingle();
  if (error) throw new Error(`last_season_overview query failed: ${error.message}`);
  if (!data) return null;

  return {
    season: data.season,
    matchesPlayed: data.matches_played,
    wins: data.wins,
    draws: data.draws,
    losses: data.losses,
    goalsFor: data.goals_for,
    goalsAgainst: data.goals_against,
    avgXg: data.avg_xg,
    possessionPct: data.possession_pct,
    passAccuracyPct: data.pass_accuracy_pct,
  };
}
