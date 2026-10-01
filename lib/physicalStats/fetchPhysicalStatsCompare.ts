// lib/physicalStats/fetchPhysicalStatsCompare.ts
// Server-only. Backs the GPS training-data comparison page: lists every
// imported session (for the two pickers) and, given a pair of them, matches
// players across both by player_id and lines their totals up side by side.
// `scope: null` compares Team Summary (whole-session) rows; a drill name
// compares just that period instead — meaningful once drills are named
// consistently across sessions (e.g. always "1st GAME"), which the import
// preview's rename field is for.
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
  photoUrl: string | null;
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

/** Drill names available for a session pair — the same name has to appear on both sides to be worth comparing. */
export async function fetchPhysicalStatsDrillOptions(
  a: { sessionDate: string; sessionType: string },
  b: { sessionDate: string; sessionType: string }
): Promise<string[]> {
  const supabase = createPsimServerClient();
  const { data, error } = await supabase
    .from("player_physical_stats")
    .select("session_date, session_type, drill")
    .not("drill", "is", null)
    .in("session_date", [a.sessionDate, b.sessionDate]);
  if (error) throw new Error(`player_physical_stats query failed: ${error.message}`);

  const rows = (data ?? []) as { session_date: string; session_type: string; drill: string }[];
  const inA = new Set(rows.filter((r) => r.session_date === a.sessionDate && r.session_type === a.sessionType).map((r) => r.drill));
  const inB = new Set(rows.filter((r) => r.session_date === b.sessionDate && r.session_type === b.sessionType).map((r) => r.drill));
  return [...inA].filter((d) => inB.has(d)).sort();
}

export async function fetchPhysicalStatsCompare(
  a: { sessionDate: string; sessionType: string },
  b: { sessionDate: string; sessionType: string },
  scope: string | null
): Promise<PhysicalStatsCompareResult> {
  const supabase = createPsimServerClient();

  let query = supabase
    .from("player_physical_stats")
    .select("player_id, session_date, session_type, total_distance_m, high_speed_running_m, sprint_distance_m, top_speed_kmh, accelerations, decelerations, minutes_played")
    .in("session_date", [a.sessionDate, b.sessionDate]);
  query = scope === null ? query.is("drill", null) : query.eq("drill", scope);

  const [{ data: rows, error }, { data: players }] = await Promise.all([query, supabase.from("players").select("id, name, photo_url")]);
  if (error) throw new Error(`player_physical_stats query failed: ${error.message}`);

  const playerById = new Map(((players ?? []) as { id: number; name: string; photo_url: string | null }[]).map((p) => [p.id, p]));
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
      playerName: playerById.get(id)?.name ?? `Player #${id}`,
      photoUrl: playerById.get(id)?.photo_url ?? null,
      a: aByPlayer.get(id) ?? null,
      b: bByPlayer.get(id) ?? null,
    }))
    .sort((x, y) => x.playerName.localeCompare(y.playerName));

  return {
    rows: compareRows,
    teamAverage: { a: average([...aByPlayer.values()]), b: average([...bByPlayer.values()]) },
  };
}
