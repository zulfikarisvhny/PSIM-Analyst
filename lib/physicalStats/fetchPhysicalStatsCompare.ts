// lib/physicalStats/fetchPhysicalStatsCompare.ts
// Server-only. Backs the GPS training-data comparison page: lists every
// imported session (for the two pickers) and, given a pair of them, matches
// players across both by player_id and lines their whole-session totals up
// side by side. Only Team Summary rows (drill IS NULL) are compared — the
// per-drill breakdown is for reviewing one session, not comparing two.
import { createPsimServerClient } from "../supabase/psimServerClient";

export interface PhysicalStatsSessionOption {
  key: string; // `${sessionDate}|${sessionType}`
  sessionDate: string;
  sessionType: string;
  playerCount: number;
}

export async function fetchPhysicalStatsSessions(): Promise<PhysicalStatsSessionOption[]> {
  const supabase = createPsimServerClient();
  const { data, error } = await supabase.from("player_physical_stats").select("session_date, session_type").is("drill", null);
  if (error) throw new Error(`player_physical_stats query failed: ${error.message}`);

  const counts = new Map<string, { sessionDate: string; sessionType: string; count: number }>();
  for (const r of (data ?? []) as { session_date: string; session_type: string }[]) {
    const key = `${r.session_date}|${r.session_type}`;
    const entry = counts.get(key) ?? { sessionDate: r.session_date, sessionType: r.session_type, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.entries()]
    .map(([key, v]) => ({ key, sessionDate: v.sessionDate, sessionType: v.sessionType, playerCount: v.count }))
    .sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : a.sessionDate > b.sessionDate ? -1 : 0));
}

export interface SideStats {
  totalDistanceM: number | null;
  highSpeedRunningM: number | null;
  sprintDistanceM: number | null;
  topSpeedKmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutesPlayed: number | null;
}

export interface ComparePlayerRow {
  playerId: number;
  playerName: string;
  a: SideStats | null;
  b: SideStats | null;
}

export interface PhysicalStatsCompareResult {
  rows: ComparePlayerRow[];
  teamAverage: { a: SideStats | null; b: SideStats | null };
}

interface RawRow {
  player_id: number | null;
  session_date: string;
  session_type: string;
  total_distance_m: number | null;
  high_speed_running_m: number | null;
  sprint_distance_m: number | null;
  top_speed_kmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutes_played: number | null;
}

function toSide(r: RawRow): SideStats {
  return {
    totalDistanceM: r.total_distance_m,
    highSpeedRunningM: r.high_speed_running_m,
    sprintDistanceM: r.sprint_distance_m,
    topSpeedKmh: r.top_speed_kmh,
    accelerations: r.accelerations,
    decelerations: r.decelerations,
    minutesPlayed: r.minutes_played,
  };
}

const SIDE_KEYS: (keyof SideStats)[] = ["totalDistanceM", "highSpeedRunningM", "sprintDistanceM", "topSpeedKmh", "accelerations", "decelerations", "minutesPlayed"];

function average(list: SideStats[]): SideStats | null {
  if (list.length === 0) return null;
  const out = {} as SideStats;
  for (const key of SIDE_KEYS) {
    const vals = list.map((s) => s[key]).filter((v): v is number => v !== null);
    out[key] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }
  return out;
}

export async function fetchPhysicalStatsCompare(
  a: { sessionDate: string; sessionType: string },
  b: { sessionDate: string; sessionType: string }
): Promise<PhysicalStatsCompareResult> {
  const supabase = createPsimServerClient();

  const [{ data: rows, error }, { data: players }] = await Promise.all([
    supabase
      .from("player_physical_stats")
      .select("player_id, session_date, session_type, total_distance_m, high_speed_running_m, sprint_distance_m, top_speed_kmh, accelerations, decelerations, minutes_played")
      .is("drill", null)
      .in("session_date", [a.sessionDate, b.sessionDate]),
    supabase.from("players").select("id, name"),
  ]);
  if (error) throw new Error(`player_physical_stats query failed: ${error.message}`);

  const playerById = new Map(((players ?? []) as { id: number; name: string }[]).map((p) => [p.id, p.name]));
  const allRows = (rows ?? []) as RawRow[];

  const aByPlayer = new Map<number, SideStats>();
  const bByPlayer = new Map<number, SideStats>();
  for (const r of allRows) {
    if (r.player_id === null) continue;
    if (r.session_date === a.sessionDate && r.session_type === a.sessionType) aByPlayer.set(r.player_id, toSide(r));
    else if (r.session_date === b.sessionDate && r.session_type === b.sessionType) bByPlayer.set(r.player_id, toSide(r));
  }

  const playerIds = new Set([...aByPlayer.keys(), ...bByPlayer.keys()]);
  const compareRows: ComparePlayerRow[] = [...playerIds]
    .map((id) => ({
      playerId: id,
      playerName: playerById.get(id) ?? `Player #${id}`,
      a: aByPlayer.get(id) ?? null,
      b: bByPlayer.get(id) ?? null,
    }))
    .sort((x, y) => x.playerName.localeCompare(y.playerName));

  return {
    rows: compareRows,
    teamAverage: { a: average([...aByPlayer.values()]), b: average([...bByPlayer.values()]) },
  };
}
