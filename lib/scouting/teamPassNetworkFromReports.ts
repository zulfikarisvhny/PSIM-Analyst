// lib/scouting/teamPassNetworkFromReports.ts
// Server-only. Aggregates a real pass network for ANY team (not just PSIM)
// straight from the match-report database — the same match_passing_summary /
// match_pass_combinations tables the PDF import already fills in, regardless
// of which two teams a given report is for. Used by the Opponent Analyst
// page's Passing Network / Average Position tabs so a scouted team gets a
// real network the moment its match reports are imported, instead of
// needing hand transcription like lib/scouting/passNetwork.ts's older
// per-team data. Returns both an "overall" network (summed across every
// imported match) and one per individual match, mirroring how the older
// hand-transcribed PASS_NETWORK_BY_TEAM offered an "Overall" entry plus each
// match.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface TeamPassNetworkPlayer {
  playerId: number;
  name: string;
  totalPasses: number;
  defThirdPct: number | null;
  midThirdPct: number | null;
  finalThirdPct: number | null;
  xPct: number | null;
  yPct: number | null;
  jersey: number | null;
}

export interface TeamPassNetworkEdge {
  fromPlayerId: number;
  toPlayerId: number;
  fromName: string;
  toName: string;
  passCount: number;
}

export interface TeamPassNetworkSlice {
  players: TeamPassNetworkPlayer[];
  edges: TeamPassNetworkEdge[];
}

export interface TeamPassNetworkMatchSlice extends TeamPassNetworkSlice {
  matchId: number;
  label: string; // e.g. "vs Borneo FC (A) — 5 Sep 2026"
}

export interface TeamPassNetworkResult {
  matchesUsed: number;
  overall: TeamPassNetworkSlice;
  perMatch: TeamPassNetworkMatchSlice[];
}

interface RawSummaryRow {
  match_id: number;
  player_id: number;
  total_passes: number;
  def_third_pct: number | null;
  mid_third_pct: number | null;
  final_third_pct: number | null;
  x_pct: number | null;
  y_pct: number | null;
  jersey_number: number | null;
}

interface RawComboRow {
  match_id: number;
  from_player_id: number;
  to_player_id: number;
  pass_count: number;
}

interface RawPlayer {
  id: number;
  name: string;
  club_id: number;
}

interface RawClub {
  id: number;
  name: string;
}

/**
 * Match-report `clubs` rows are named straight off the PDF's own printed
 * team name ("Madura United", "Persija"), which is shorter than the league
 * table's full name this page is keyed by ("Madura United FC", "Persija
 * Jakarta") — an exact match would miss almost every team. Falls back to
 * "one name starts with the other" (case-insensitive), which covers every
 * real pairing seen so far except Bhayangkara's ("Bhayangkara F.C." vs
 * "Bhayangkara Presisi FC" share no common prefix).
 */
function findClubByLooseName<T extends { name: string }>(clubs: T[], teamFullName: string): T | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(teamFullName);
  return clubs.find((c) => norm(c.name) === target) ?? clubs.find((c) => target.startsWith(norm(c.name)) || norm(c.name).startsWith(target));
}

function aggregate(summaryRows: RawSummaryRow[], comboRows: RawComboRow[], playerById: Map<number, RawPlayer>): TeamPassNetworkSlice {
  const relevantSummary = summaryRows.filter((r) => playerById.has(r.player_id));

  // matchCount tracks how many matches actually contributed to each
  // player/edge, so "overall" divides down to a per-match average instead of
  // a raw sum across every imported match (a per-match call naturally has
  // matchCount 1 per player/edge, so the division there is a no-op).
  const playerAgg = new Map<
    number,
    { totalPasses: number; matchCount: number; xSum: number; ySum: number; posCount: number; def: number[]; mid: number[]; final: number[]; jersey: number | null }
  >();
  for (const r of relevantSummary) {
    const agg = playerAgg.get(r.player_id) ?? { totalPasses: 0, matchCount: 0, xSum: 0, ySum: 0, posCount: 0, def: [], mid: [], final: [], jersey: r.jersey_number };
    agg.totalPasses += r.total_passes;
    agg.matchCount++;
    if (r.x_pct !== null && r.y_pct !== null) {
      agg.xSum += r.x_pct;
      agg.ySum += r.y_pct;
      agg.posCount++;
    }
    if (r.def_third_pct !== null) agg.def.push(r.def_third_pct);
    if (r.mid_third_pct !== null) agg.mid.push(r.mid_third_pct);
    if (r.final_third_pct !== null) agg.final.push(r.final_third_pct);
    agg.jersey = agg.jersey ?? r.jersey_number;
    playerAgg.set(r.player_id, agg);
  }
  const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null);

  const players: TeamPassNetworkPlayer[] = [...playerAgg.entries()]
    .map(([playerId, agg]) => ({
      playerId,
      name: playerById.get(playerId)?.name ?? "Unknown",
      totalPasses: Math.round(agg.totalPasses / agg.matchCount),
      defThirdPct: avg(agg.def),
      midThirdPct: avg(agg.mid),
      finalThirdPct: avg(agg.final),
      xPct: agg.posCount > 0 ? agg.xSum / agg.posCount : null,
      yPct: agg.posCount > 0 ? agg.ySum / agg.posCount : null,
      jersey: agg.jersey,
    }))
    .sort((a, b) => b.totalPasses - a.totalPasses);

  const edgeAgg = new Map<string, { fromPlayerId: number; toPlayerId: number; passCount: number; matchCount: number }>();
  for (const r of comboRows) {
    if (!playerAgg.has(r.from_player_id) || !playerAgg.has(r.to_player_id)) continue;
    const key = `${r.from_player_id}-${r.to_player_id}`;
    const existing = edgeAgg.get(key);
    if (existing) {
      existing.passCount += r.pass_count;
      existing.matchCount++;
    } else {
      edgeAgg.set(key, { fromPlayerId: r.from_player_id, toPlayerId: r.to_player_id, passCount: r.pass_count, matchCount: 1 });
    }
  }
  const edges: TeamPassNetworkEdge[] = [...edgeAgg.values()].map((e) => ({
    fromPlayerId: e.fromPlayerId,
    toPlayerId: e.toPlayerId,
    passCount: Math.round(e.passCount / e.matchCount),
    fromName: playerById.get(e.fromPlayerId)?.name ?? "Unknown",
    toName: playerById.get(e.toPlayerId)?.name ?? "Unknown",
  }));

  return { players, edges };
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Real, aggregated pass network for a team across every match report imported for it — null if none imported yet. */
export async function fetchTeamPassNetworkFromReports(teamFullName: string): Promise<TeamPassNetworkResult | null> {
  const supabase = createPsimServerClient();

  const { data: allClubs } = await supabase.from("clubs").select("id, name");
  const club = findClubByLooseName((allClubs ?? []) as RawClub[], teamFullName);
  if (!club) return null;
  const clubId = club.id;
  const clubById = new Map(((allClubs ?? []) as RawClub[]).map((c) => [c.id, c]));

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_date, home_club_id, away_club_id")
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`);
  const matchRows = matches ?? [];
  if (matchRows.length === 0) return null;
  const matchIds = matchRows.map((m: { id: number }) => m.id);

  const [{ data: players }, { data: summaryRows }, { data: comboRows }] = await Promise.all([
    supabase.from("players").select("id, name, club_id").eq("club_id", clubId),
    supabase
      .from("match_passing_summary")
      .select("match_id, player_id, total_passes, def_third_pct, mid_third_pct, final_third_pct, x_pct, y_pct, jersey_number")
      .in("match_id", matchIds),
    supabase.from("match_pass_combinations").select("match_id, from_player_id, to_player_id, pass_count").in("match_id", matchIds),
  ]);

  const playerById = new Map(((players ?? []) as RawPlayer[]).map((p) => [p.id, p]));
  const allSummary = (summaryRows ?? []) as RawSummaryRow[];
  const allCombo = (comboRows ?? []) as RawComboRow[];
  const summaryForClub = allSummary.filter((r) => playerById.has(r.player_id));
  if (summaryForClub.length === 0) return null;

  const matchIdsWithData = [...new Set(summaryForClub.map((r) => r.match_id))];
  const overall = aggregate(allSummary, allCombo, playerById);

  const perMatch: TeamPassNetworkMatchSlice[] = matchIdsWithData
    .map((matchId) => {
      const m = matchRows.find((mm: { id: number }) => mm.id === matchId);
      const slice = aggregate(
        allSummary.filter((r) => r.match_id === matchId),
        allCombo.filter((r) => r.match_id === matchId),
        playerById
      );
      let label = `Match ${matchId}`;
      if (m) {
        const isHome = m.home_club_id === clubId;
        const oppId = isHome ? m.away_club_id : m.home_club_id;
        const oppName = clubById.get(oppId)?.name ?? "Unknown";
        label = `vs ${oppName} (${isHome ? "H" : "A"}) — ${formatDate(m.match_date)}`;
      }
      return { matchId, label, ...slice };
    })
    .sort((a, b) => a.matchId - b.matchId);

  return { matchesUsed: matchIdsWithData.length, overall, perMatch };
}
