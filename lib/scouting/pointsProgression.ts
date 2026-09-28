// lib/scouting/pointsProgression.ts
// Server-only. Builds cumulative-points-per-gameweek series for this season
// (from `matches`, which has both scores + club ids directly) and last
// season (from `last_season_match_stats` — opponent name and score are
// parsed out of `match_label`, e.g. "Arema - PSIM Yogyakarta 3:1"; the
// opponent's goals also live in stats.conceded_goals, used as a cross-check
// on the parsed score).
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface MatchResult {
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
  home: boolean;
}

export interface PointsProgressionPoint {
  gameweek: number;
  lastSeasonPoints: number | null;
  lastSeasonMatch: MatchResult | null;
  currentSeasonPoints: number | null;
  currentSeasonMatch: MatchResult | null;
}

function pointsFor(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
}

function resultLetter(goalsFor: number, goalsAgainst: number): "W" | "D" | "L" {
  if (goalsFor > goalsAgainst) return "W";
  if (goalsFor === goalsAgainst) return "D";
  return "L";
}

const MATCH_LABEL_RE = /^(.+?) - (.+?) (\d+):(\d+)$/;

function parseLastSeasonMatch(clubName: string, matchLabel: string): MatchResult | null {
  const m = matchLabel.match(MATCH_LABEL_RE);
  if (!m) return null;
  const [, home, away, homeScoreStr, awayScoreStr] = m;
  const homeScore = Number(homeScoreStr);
  const awayScore = Number(awayScoreStr);
  const isHome = home.trim() === clubName;
  const opponent = isHome ? away.trim() : home.trim();
  const goalsFor = isHome ? homeScore : awayScore;
  const goalsAgainst = isHome ? awayScore : homeScore;
  return { opponent, goalsFor, goalsAgainst, result: resultLetter(goalsFor, goalsAgainst), home: isHome };
}

function cumulative(perMatchPoints: number[]): number[] {
  let running = 0;
  return perMatchPoints.map((p) => {
    running += p;
    return running;
  });
}

export async function fetchPointsProgression(clubName: string): Promise<PointsProgressionPoint[]> {
  const supabase = createPsimServerClient();
  const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
  if (!club) return [];

  const { data: lastSeasonRows, error: lastSeasonErr } = await supabase
    .from("last_season_match_stats")
    .select("match_date, match_label, goals, stats")
    .eq("club_id", club.id)
    .order("match_date", { ascending: true });
  if (lastSeasonErr) throw new Error(`last_season_match_stats query failed: ${lastSeasonErr.message}`);

  const { data: matchRows, error: matchesErr } = await supabase
    .from("matches")
    .select("match_date, home_club_id, away_club_id, home_score, away_score, home:clubs!home_club_id(name), away:clubs!away_club_id(name)")
    .or(`home_club_id.eq.${club.id},away_club_id.eq.${club.id}`)
    .order("match_date", { ascending: true });
  if (matchesErr) throw new Error(`matches query failed: ${matchesErr.message}`);

  const lastSeasonMatches = (lastSeasonRows ?? [])
    .map((r) => parseLastSeasonMatch(clubName, r.match_label))
    .filter((m): m is MatchResult => m !== null);

  const currentSeasonMatches = (matchRows ?? [])
    .map((m: any) => {
      const isHome = m.home_club_id === club.id;
      const gf = isHome ? m.home_score : m.away_score;
      const ga = isHome ? m.away_score : m.home_score;
      if (typeof gf !== "number" || typeof ga !== "number") return null;
      const opponentRel = isHome ? m.away : m.home;
      const opponent = Array.isArray(opponentRel) ? opponentRel[0]?.name : opponentRel?.name;
      return { opponent: opponent ?? "Unknown", goalsFor: gf, goalsAgainst: ga, result: resultLetter(gf, ga), home: isHome } as MatchResult;
    })
    .filter((m): m is MatchResult => m !== null);

  const lastSeasonCumulative = cumulative(lastSeasonMatches.map((m) => pointsFor(m.goalsFor, m.goalsAgainst)));
  const currentSeasonCumulative = cumulative(currentSeasonMatches.map((m) => pointsFor(m.goalsFor, m.goalsAgainst)));

  const totalGameweeks = Math.max(lastSeasonCumulative.length, currentSeasonCumulative.length);
  const points: PointsProgressionPoint[] = [];
  for (let i = 0; i < totalGameweeks; i++) {
    points.push({
      gameweek: i + 1,
      lastSeasonPoints: lastSeasonCumulative[i] ?? null,
      lastSeasonMatch: lastSeasonMatches[i] ?? null,
      currentSeasonPoints: currentSeasonCumulative[i] ?? null,
      currentSeasonMatch: currentSeasonMatches[i] ?? null,
    });
  }
  return points;
}
