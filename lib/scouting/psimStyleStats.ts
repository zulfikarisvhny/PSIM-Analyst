// lib/scouting/psimStyleStats.ts
// Server-only. Reads team_style_stats (match-derived playing-style metrics,
// one row per club per season) joined to clubs for the team name.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface TeamStyleRow {
  clubId: number;
  clubName: string;
  logoUrl: string | null;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  possessionPct: number | null;
  directPct: number | null;
  passAccuracyPct: number | null;
  xgPerShot: number | null;
  proactiveDefPct: number | null;
  stepOutPct: number | null;
  aerialPct: number | null;
}

interface RawRow {
  club_id: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  possession_pct: number | null;
  direct_pct: number | null;
  pass_accuracy_pct: number | null;
  xg_per_shot: number | null;
  proactive_def_pct: number | null;
  step_out_pct: number | null;
  aerial_pct: number | null;
  clubs: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
}

function firstClub(rel: RawRow["clubs"]): { name: string; logo_url: string | null } {
  if (!rel) return { name: "Unknown", logo_url: null };
  return Array.isArray(rel) ? rel[0] ?? { name: "Unknown", logo_url: null } : rel;
}

export async function fetchTeamStyleStats(): Promise<TeamStyleRow[]> {
  const supabase = createPsimServerClient();
  const { data, error } = await supabase
    .from("team_style_stats")
    .select(
      "club_id, matches_played, wins, draws, losses, possession_pct, direct_pct, pass_accuracy_pct, xg_per_shot, proactive_def_pct, step_out_pct, aerial_pct, clubs(name, logo_url)"
    );
  if (error) throw new Error(`team_style_stats query failed: ${error.message}`);

  return ((data ?? []) as unknown as RawRow[]).map((r) => {
    const club = firstClub(r.clubs);
    return {
    clubId: r.club_id,
    clubName: club.name,
    logoUrl: club.logo_url,
    matchesPlayed: r.matches_played,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    possessionPct: r.possession_pct,
    directPct: r.direct_pct,
    passAccuracyPct: r.pass_accuracy_pct,
    xgPerShot: r.xg_per_shot,
    proactiveDefPct: r.proactive_def_pct,
    stepOutPct: r.step_out_pct,
    aerialPct: r.aerial_pct,
    };
  });
}
