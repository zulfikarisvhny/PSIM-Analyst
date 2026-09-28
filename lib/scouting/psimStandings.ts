// lib/scouting/psimStandings.ts
// Server-only. Reads the current-season (2026/2027) league table from the
// PSIM Yogyakarta project's own `standings` table — entered manually, since
// `matches` only has PSIM's own fixtures (not the other 17 clubs' matches
// against each other) and the old project's `liga_1_2026_2027` table turned
// out to be last season's completed standings, not this season's.
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";

export interface PsimStandingRow {
  clubId: number | null;
  team: string;
  logoUrl: string | null;
  mp: number;
  w: number;
  d: number;
  l: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export async function fetchPsimStandings(): Promise<PsimStandingRow[]> {
  const supabase = createPsimServerClient();
  const { data, error } = await supabase.from("standings").select("club_id, mp, w, d, l, goals_for, goals_against, points, clubs(name, logo_url)");
  if (error || !data) return [];

  const rows: PsimStandingRow[] = (data as any[]).map((r) => {
    const club = Array.isArray(r.clubs) ? r.clubs[0] : r.clubs;
    return {
      clubId: r.club_id,
      team: club?.name ?? "Unknown",
      logoUrl: club?.logo_url ?? null,
      mp: r.mp,
      w: r.w,
      d: r.d,
      l: r.l,
      goalsFor: r.goals_for,
      goalsAgainst: r.goals_against,
      goalDiff: r.goals_for - r.goals_against,
      points: r.points,
    };
  });

  return rows.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
}
