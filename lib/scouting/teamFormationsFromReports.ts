// lib/scouting/teamFormationsFromReports.ts
// Server-only. Pulls a scouted team's own formation — starting XI, final XI
// (after every sub/tactical reshuffle), and who was subbed when — from every
// imported match report that team appears in, regardless of opponent. Same
// "any team, not just PSIM" approach as teamPassNetworkFromReports.ts, over
// the same match-report tables (match_formation_lineups, match_events).
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface FormationSlotEntry {
  playerId: number | null;
  playerName: string;
  jersey: number;
  xPct: number; // 0-100, touchline to touchline
  yPct: number; // 0-100, own goal = 0, opponent goal = 100
}

export interface SubstitutionEntry {
  minute: number;
  playerOutName: string | null;
  playerInName: string | null;
}

export interface TeamFormationMatch {
  matchId: number;
  label: string; // "vs Borneo FC (A) — 5 Sep 2026"
  opponent: string;
  isHome: boolean;
  matchDate: string | null;
  starting: FormationSlotEntry[];
  final: FormationSlotEntry[];
  substitutions: SubstitutionEntry[];
}

interface RawClub {
  id: number;
  name: string;
}

interface RawMatch {
  id: number;
  match_date: string | null;
  home_club_id: number;
  away_club_id: number;
}

interface RawFormationRow {
  match_id: number;
  club_id: number;
  player_id: number | null;
  player_name_raw: string;
  jersey_number: number;
  phase: "starting" | "final";
  x_pct: number;
  y_pct: number;
}

interface RawEventRow {
  match_id: number;
  club_id: number;
  player_name_raw: string | null;
  sub_in_player_name_raw: string | null;
  minute: number;
}

/**
 * Match-report `clubs` rows are named straight off the PDF's own printed
 * team name ("Madura United", "Persija"), shorter than the league table's
 * full name this page is usually keyed by ("Madura United FC", "Persija
 * Jakarta") — an exact match would miss almost every team. Falls back to
 * "one name starts with the other" (case-insensitive). Same helper as
 * teamPassNetworkFromReports.ts.
 */
function findClubByLooseName<T extends { name: string }>(clubs: T[], teamFullName: string): T | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(teamFullName);
  return clubs.find((c) => norm(c.name) === target) ?? clubs.find((c) => target.startsWith(norm(c.name)) || norm(c.name).startsWith(target));
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Every imported match report's starting/final formation for one team, newest first — [] if none imported yet. */
export async function fetchTeamFormations(teamFullName: string): Promise<TeamFormationMatch[]> {
  const supabase = createPsimServerClient();

  const { data: allClubs } = await supabase.from("clubs").select("id, name");
  const club = findClubByLooseName((allClubs ?? []) as RawClub[], teamFullName);
  if (!club) return [];
  const clubId = club.id;
  const clubById = new Map(((allClubs ?? []) as RawClub[]).map((c) => [c.id, c]));

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_date, home_club_id, away_club_id")
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`);
  const matchRows = (matches ?? []) as RawMatch[];
  if (matchRows.length === 0) return [];
  const matchIds = matchRows.map((m) => m.id);

  const [{ data: lineupRows }, { data: eventRows }] = await Promise.all([
    supabase
      .from("match_formation_lineups")
      .select("match_id, club_id, player_id, player_name_raw, jersey_number, phase, x_pct, y_pct")
      .eq("club_id", clubId)
      .in("match_id", matchIds),
    supabase
      .from("match_events")
      .select("match_id, club_id, player_name_raw, sub_in_player_name_raw, minute")
      .eq("club_id", clubId)
      .eq("event_type", "substitution")
      .in("match_id", matchIds),
  ]);

  const lineups = (lineupRows ?? []) as RawFormationRow[];
  const subs = (eventRows ?? []) as RawEventRow[];
  const matchIdsWithLineups = [...new Set(lineups.map((r) => r.match_id))];

  const toSlot = (r: RawFormationRow): FormationSlotEntry => ({
    playerId: r.player_id,
    playerName: r.player_name_raw,
    jersey: r.jersey_number,
    xPct: r.x_pct,
    yPct: r.y_pct,
  });

  return matchIdsWithLineups
    .map((matchId) => {
      const m = matchRows.find((mm) => mm.id === matchId)!;
      const isHome = m.home_club_id === clubId;
      const oppId = isHome ? m.away_club_id : m.home_club_id;
      const opponent = clubById.get(oppId)?.name ?? "Unknown";
      const label = `vs ${opponent} (${isHome ? "H" : "A"})${m.match_date ? ` — ${formatDate(m.match_date)}` : ""}`;

      const matchLineups = lineups.filter((r) => r.match_id === matchId);

      const substitutions: SubstitutionEntry[] = subs
        .filter((r) => r.match_id === matchId)
        .map((r) => ({ minute: r.minute, playerOutName: r.player_name_raw, playerInName: r.sub_in_player_name_raw }))
        .sort((a, b) => a.minute - b.minute);

      return {
        matchId,
        label,
        opponent,
        isHome,
        matchDate: m.match_date,
        starting: matchLineups.filter((r) => r.phase === "starting").map(toSlot),
        final: matchLineups.filter((r) => r.phase === "final").map(toSlot),
        substitutions,
      };
    })
    .sort((a, b) => (b.matchDate ?? "").localeCompare(a.matchDate ?? ""));
}
