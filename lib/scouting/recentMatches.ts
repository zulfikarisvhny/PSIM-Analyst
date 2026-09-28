// lib/scouting/recentMatches.ts
// Server-only. Last N completed matches (with a final score) for a club,
// most recent first — for a compact "recent form" widget on the Overview page.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface RecentMatch {
  matchId: number;
  date: string;
  round: string | null;
  opponent: string;
  opponentLogoUrl: string | null;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
  competition: string | null;
}

export async function fetchRecentMatches(clubName: string, limit = 3): Promise<RecentMatch[]> {
  const supabase = createPsimServerClient();
  const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
  if (!club) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, match_date, round, competition, home_club_id, away_club_id, home_score, away_score, home:clubs!home_club_id(name, logo_url), away:clubs!away_club_id(name, logo_url)"
    )
    .or(`home_club_id.eq.${club.id},away_club_id.eq.${club.id}`)
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("match_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`matches query failed: ${error.message}`);

  return (data ?? []).map((m: any) => {
    const isHome = m.home_club_id === club.id;
    const opponentRel = isHome ? m.away : m.home;
    const opponent = Array.isArray(opponentRel) ? opponentRel[0] : opponentRel;
    const goalsFor: number = isHome ? m.home_score : m.away_score;
    const goalsAgainst: number = isHome ? m.away_score : m.home_score;
    const result: RecentMatch["result"] = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
    return {
      matchId: m.id,
      date: m.match_date,
      round: m.round,
      opponent: opponent?.name ?? "Unknown",
      opponentLogoUrl: opponent?.logo_url ?? null,
      home: isHome,
      goalsFor,
      goalsAgainst,
      result,
      competition: m.competition,
    };
  });
}
