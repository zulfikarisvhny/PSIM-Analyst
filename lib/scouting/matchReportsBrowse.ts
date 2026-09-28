// lib/scouting/matchReportsBrowse.ts
// Server-only. Lists matches that have an imported team_match_stats report
// and returns each one's full home/away breakdown for browsing.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface TeamMatchStatsSide {
  duration: number | null;
  scheme: string | null;
  goals: number | null;
  xg: number | null;
  possessionPct: number | null;
  stats: Record<string, string>;
}

export interface TimeSegmentRow {
  segment: string; // "0-15", "16-30", "31-45+", "46-60", "61-75", "76-90+"
  possessionPct: number | null;
  passAccuracyPct: number | null;
  longPassSharePct: number | null;
  duelsWinPct: number | null;
  attacksPerMin: number | null;
  recoveriesPerMin: number | null;
  avgFormationLineM: number | null;
  ppda: number | null;
}

export interface PassNetworkPlayer {
  playerId: number;
  name: string;
  totalPasses: number;
  defThirdPct: number | null;
  midThirdPct: number | null;
  finalThirdPct: number | null;
}

export interface PassNetworkEdge {
  fromPlayerId: number;
  toPlayerId: number;
  fromName: string;
  toName: string;
  passCount: number;
}

export interface TeamPassNetwork {
  players: PassNetworkPlayer[];
  edges: PassNetworkEdge[];
}

export interface GoalEntry {
  minute: string; // e.g. "71" or "45+2"
  player: string;
}

export interface MatchEventEntry {
  type: "goal" | "yellow_card" | "red_card" | "substitution";
  minute: string;
  player: string; // scorer / carded player / player going off
  subInPlayer: string | null; // substitution only
}

export interface LineupPlayerEntry {
  playerId: number | null;
  name: string;
  jersey: number | null;
  position: string;
  photoUrl: string | null;
}

export interface PlayerPhysicalStat {
  playerId: number;
  name: string;
  totalDistanceM: number | null;
  highSpeedRunningM: number | null;
  sprintDistanceM: number | null;
  sprintCount: number | null;
  topSpeedKmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutesPlayed: number | null;
}

export interface MatchReportDetail {
  matchId: number;
  matchDate: string;
  competition: string | null;
  round: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  home: TeamMatchStatsSide | null;
  away: TeamMatchStatsSide | null;
  timeSegments: { home: TimeSegmentRow[]; away: TimeSegmentRow[] } | null;
  passNetwork: { home: TeamPassNetwork; away: TeamPassNetwork } | null;
  psimPhysicalStats: PlayerPhysicalStat[] | null;
  goals: { home: GoalEntry[]; away: GoalEntry[] } | null;
  events: { home: MatchEventEntry[]; away: MatchEventEntry[] } | null;
  lineups: { home: LineupPlayerEntry[]; away: LineupPlayerEntry[] } | null;
}

interface RawMatch {
  id: number;
  match_date: string;
  competition: string | null;
  round: string | null;
  home_score: number | null;
  away_score: number | null;
  home_club_id: number;
  away_club_id: number;
  home: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
  away: { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null;
}

interface RawStatsRow {
  club_id: number;
  match_date: string;
  duration: number | null;
  scheme: string | null;
  goals: number | null;
  xg: number | null;
  possession_pct: number | null;
  stats: Record<string, string> | null;
}

interface RawSegmentRow {
  match_id: number;
  club_id: number;
  segment: string;
  possession_pct: number | null;
  pass_accuracy_pct: number | null;
  long_pass_share_pct: number | null;
  duels_win_pct: number | null;
  attacks_per_min: number | null;
  recoveries_per_min: number | null;
  avg_formation_line_m: number | null;
  ppda: number | null;
}

interface RawComboRow {
  match_id: number;
  from_player_id: number;
  to_player_id: number;
  pass_count: number;
}

interface RawSummaryRow {
  match_id: number;
  player_id: number;
  total_passes: number;
  def_third_pct: number | null;
  mid_third_pct: number | null;
  final_third_pct: number | null;
}

interface RawPlayer {
  id: number;
  name: string;
  club_id: number;
  photo_url: string | null;
}

interface RawLineupRow {
  match_id: number;
  club_id: number;
  player_id: number | null;
  player_name_raw: string;
  jersey_number: number | null;
  position_code: string;
}

interface RawEventRow {
  match_id: number;
  club_id: number;
  event_type: "goal" | "yellow_card" | "red_card" | "substitution";
  player_id: number | null;
  player_name_raw: string;
  sub_in_player_id: number | null;
  sub_in_player_name_raw: string | null;
  minute: string;
}

interface RawPhysicalRow {
  match_id: number;
  player_id: number;
  total_distance_m: number | null;
  high_speed_running_m: number | null;
  sprint_distance_m: number | null;
  sprint_count: number | null;
  top_speed_kmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutes_played: number | null;
}

const SEGMENT_ORDER = ["0-15", "16-30", "31-45+", "46-60", "61-75", "76-90+"];
const PSIM = "PSIM Yogyakarta";

function firstClub(rel: RawMatch["home"]): { name: string; logo_url: string | null } {
  if (!rel) return { name: "Unknown", logo_url: null };
  return Array.isArray(rel) ? rel[0] ?? { name: "Unknown", logo_url: null } : rel;
}

export async function fetchAllMatchReports(): Promise<MatchReportDetail[]> {
  const supabase = createPsimServerClient();

  const { data: matches, error: matchesErr } = await supabase
    .from("matches")
    .select(
      "id, match_date, competition, round, home_score, away_score, home_club_id, away_club_id, home:clubs!home_club_id(name, logo_url), away:clubs!away_club_id(name, logo_url)"
    )
    .order("match_date", { ascending: false });
  if (matchesErr) throw new Error(`matches query failed: ${matchesErr.message}`);

  const { data: statsRows, error: statsErr } = await supabase
    .from("team_match_stats")
    .select("club_id, match_date, duration, scheme, goals, xg, possession_pct, stats");
  if (statsErr) throw new Error(`team_match_stats query failed: ${statsErr.message}`);

  const statsByKey = new Map<string, TeamMatchStatsSide>();
  for (const r of (statsRows ?? []) as RawStatsRow[]) {
    statsByKey.set(`${r.club_id}:${r.match_date}`, {
      duration: r.duration,
      scheme: r.scheme,
      goals: r.goals,
      xg: r.xg,
      possessionPct: r.possession_pct,
      stats: r.stats ?? {},
    });
  }

  const [{ data: segmentRows }, { data: comboRows }, { data: summaryRows }, { data: players }, { data: physicalRows }, { data: eventRows }, { data: lineupRows }] =
    await Promise.all([
      supabase
        .from("match_time_segments")
        .select("match_id, club_id, segment, possession_pct, pass_accuracy_pct, long_pass_share_pct, duels_win_pct, attacks_per_min, recoveries_per_min, avg_formation_line_m, ppda"),
      supabase.from("match_pass_combinations").select("match_id, from_player_id, to_player_id, pass_count"),
      supabase.from("match_passing_summary").select("match_id, player_id, total_passes, def_third_pct, mid_third_pct, final_third_pct"),
      supabase.from("players").select("id, name, club_id, photo_url"),
      supabase
        .from("player_physical_stats")
        .select("match_id, player_id, total_distance_m, high_speed_running_m, sprint_distance_m, sprint_count, top_speed_kmh, accelerations, decelerations, minutes_played"),
      supabase
        .from("match_events")
        .select("match_id, club_id, event_type, player_id, player_name_raw, sub_in_player_id, sub_in_player_name_raw, minute"),
      supabase.from("match_lineups").select("match_id, club_id, player_id, player_name_raw, jersey_number, position_code"),
    ]);

  const playerById = new Map(((players ?? []) as RawPlayer[]).map((p) => [p.id, p]));

  // Keyed by "matchId:clubId" (not just matchId) so the per-match lookup below
  // can pull out only the PSIM side's rows, ignoring the opponent's.
  const physicalByKey = new Map<string, PlayerPhysicalStat[]>();
  for (const r of (physicalRows ?? []) as RawPhysicalRow[]) {
    const player = playerById.get(r.player_id);
    if (!player) continue;
    const key = `${r.match_id}:${player.club_id}`;
    const list = physicalByKey.get(key) ?? [];
    list.push({
      playerId: r.player_id,
      name: player.name,
      totalDistanceM: r.total_distance_m,
      highSpeedRunningM: r.high_speed_running_m,
      sprintDistanceM: r.sprint_distance_m,
      sprintCount: r.sprint_count,
      topSpeedKmh: r.top_speed_kmh,
      accelerations: r.accelerations,
      decelerations: r.decelerations,
      minutesPlayed: r.minutes_played,
    });
    physicalByKey.set(key, list);
  }
  for (const list of physicalByKey.values()) {
    list.sort((a, b) => (b.totalDistanceM ?? 0) - (a.totalDistanceM ?? 0));
  }

  function minuteSortValue(minute: string): number {
    const m = minute.match(/^(\d+)(?:\+(\d+))?$/);
    if (!m) return 0;
    return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
  }

  const eventsByKey = new Map<string, MatchEventEntry[]>();
  for (const r of (eventRows ?? []) as RawEventRow[]) {
    const key = `${r.match_id}:${r.club_id}`;
    const list = eventsByKey.get(key) ?? [];
    list.push({
      type: r.event_type,
      minute: r.minute,
      player: r.player_id ? playerById.get(r.player_id)?.name ?? r.player_name_raw : r.player_name_raw,
      subInPlayer: r.sub_in_player_id ? playerById.get(r.sub_in_player_id)?.name ?? r.sub_in_player_name_raw : r.sub_in_player_name_raw,
    });
    eventsByKey.set(key, list);
  }
  for (const list of eventsByKey.values()) {
    list.sort((a, b) => minuteSortValue(a.minute) - minuteSortValue(b.minute));
  }

  const lineupsByKey = new Map<string, LineupPlayerEntry[]>();
  for (const r of (lineupRows ?? []) as RawLineupRow[]) {
    const key = `${r.match_id}:${r.club_id}`;
    const list = lineupsByKey.get(key) ?? [];
    const player = r.player_id ? playerById.get(r.player_id) : undefined;
    list.push({
      playerId: r.player_id,
      name: player?.name ?? r.player_name_raw,
      jersey: r.jersey_number,
      position: r.position_code,
      photoUrl: player?.photo_url ?? null,
    });
    lineupsByKey.set(key, list);
  }

  const goalsByKey = new Map<string, GoalEntry[]>();
  for (const [key, list] of eventsByKey) {
    goalsByKey.set(
      key,
      list.filter((e) => e.type === "goal").map((e) => ({ minute: e.minute, player: e.player }))
    );
  }

  const segmentsByKey = new Map<string, TimeSegmentRow[]>();
  for (const r of (segmentRows ?? []) as RawSegmentRow[]) {
    const key = `${r.match_id}:${r.club_id}`;
    const list = segmentsByKey.get(key) ?? [];
    list.push({
      segment: r.segment,
      possessionPct: r.possession_pct,
      passAccuracyPct: r.pass_accuracy_pct,
      longPassSharePct: r.long_pass_share_pct,
      duelsWinPct: r.duels_win_pct,
      attacksPerMin: r.attacks_per_min,
      recoveriesPerMin: r.recoveries_per_min,
      avgFormationLineM: r.avg_formation_line_m,
      ppda: r.ppda,
    });
    segmentsByKey.set(key, list);
  }
  for (const list of segmentsByKey.values()) {
    list.sort((a, b) => SEGMENT_ORDER.indexOf(a.segment) - SEGMENT_ORDER.indexOf(b.segment));
  }

  function passNetworkForClub(matchId: number, clubId: number): TeamPassNetwork {
    const summaryPlayers = ((summaryRows ?? []) as RawSummaryRow[])
      .filter((r) => r.match_id === matchId && playerById.get(r.player_id)?.club_id === clubId)
      .map((r) => ({
        playerId: r.player_id,
        name: playerById.get(r.player_id)?.name ?? "Unknown",
        totalPasses: r.total_passes,
        defThirdPct: r.def_third_pct,
        midThirdPct: r.mid_third_pct,
        finalThirdPct: r.final_third_pct,
      }))
      .sort((a, b) => b.totalPasses - a.totalPasses);

    const edges = ((comboRows ?? []) as RawComboRow[])
      .filter((r) => r.match_id === matchId && playerById.get(r.from_player_id)?.club_id === clubId)
      .map((r) => ({
        fromPlayerId: r.from_player_id,
        toPlayerId: r.to_player_id,
        fromName: playerById.get(r.from_player_id)?.name ?? "Unknown",
        toName: playerById.get(r.to_player_id)?.name ?? "Unknown",
        passCount: r.pass_count,
      }));

    return { players: summaryPlayers, edges };
  }

  const reports: MatchReportDetail[] = [];
  for (const m of (matches ?? []) as unknown as RawMatch[]) {
    const home = statsByKey.get(`${m.home_club_id}:${m.match_date}`) ?? null;
    const away = statsByKey.get(`${m.away_club_id}:${m.match_date}`) ?? null;
    if (!home && !away) continue; // no imported report for this match yet

    const segHome = segmentsByKey.get(`${m.id}:${m.home_club_id}`) ?? [];
    const segAway = segmentsByKey.get(`${m.id}:${m.away_club_id}`) ?? [];
    const timeSegments = segHome.length > 0 || segAway.length > 0 ? { home: segHome, away: segAway } : null;

    const homeNetwork = passNetworkForClub(m.id, m.home_club_id);
    const awayNetwork = passNetworkForClub(m.id, m.away_club_id);
    const passNetwork = homeNetwork.players.length > 0 || awayNetwork.players.length > 0 ? { home: homeNetwork, away: awayNetwork } : null;

    const homeClub = firstClub(m.home);
    const awayClub = firstClub(m.away);
    const homeTeam = homeClub.name;
    const awayTeam = awayClub.name;
    const psimClubId = homeTeam === PSIM ? m.home_club_id : awayTeam === PSIM ? m.away_club_id : null;
    const psimPhysicalStats = psimClubId !== null ? physicalByKey.get(`${m.id}:${psimClubId}`) ?? null : null;

    const goalsHome = goalsByKey.get(`${m.id}:${m.home_club_id}`) ?? [];
    const goalsAway = goalsByKey.get(`${m.id}:${m.away_club_id}`) ?? [];
    const goals = goalsHome.length > 0 || goalsAway.length > 0 ? { home: goalsHome, away: goalsAway } : null;

    const eventsHome = eventsByKey.get(`${m.id}:${m.home_club_id}`) ?? [];
    const eventsAway = eventsByKey.get(`${m.id}:${m.away_club_id}`) ?? [];
    const events = eventsHome.length > 0 || eventsAway.length > 0 ? { home: eventsHome, away: eventsAway } : null;

    const lineupHome = lineupsByKey.get(`${m.id}:${m.home_club_id}`) ?? [];
    const lineupAway = lineupsByKey.get(`${m.id}:${m.away_club_id}`) ?? [];
    const lineups = lineupHome.length > 0 || lineupAway.length > 0 ? { home: lineupHome, away: lineupAway } : null;

    reports.push({
      matchId: m.id,
      matchDate: m.match_date,
      competition: m.competition,
      round: m.round,
      homeTeam,
      awayTeam,
      homeLogoUrl: homeClub.logo_url,
      awayLogoUrl: awayClub.logo_url,
      homeScore: m.home_score,
      awayScore: m.away_score,
      home,
      away,
      timeSegments,
      passNetwork,
      psimPhysicalStats,
      goals,
      events,
      lineups,
    });
  }

  return reports;
}
