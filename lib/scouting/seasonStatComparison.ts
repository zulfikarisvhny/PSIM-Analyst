// lib/scouting/seasonStatComparison.ts
// Server-only. Averages every MATCH_STAT_MAPPINGS metric across this
// season's team_match_stats rows and last season's last_season_match_stats
// rows for one club, so the two (differently-shaped) data sources become one
// comparable list.
import { createPsimServerClient } from "../supabase/psimServerClient";
import { MATCH_STAT_MAPPINGS, type TeamMatchStatsBlob, type LastSeasonStatsBlob } from "./matchStatMapping";

export interface SeasonStatComparisonRow {
  label: string;
  unit?: string;
  decimals: number;
  thisSeasonAvg: number | null;
  lastSeasonAvg: number | null;
}

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export async function fetchSeasonStatComparison(clubName: string): Promise<SeasonStatComparisonRow[]> {
  const supabase = createPsimServerClient();
  const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
  if (!club) return [];

  const { data: thisSeasonRows, error: thisErr } = await supabase.from("team_match_stats").select("stats").eq("club_id", club.id);
  if (thisErr) throw new Error(`team_match_stats query failed: ${thisErr.message}`);

  const { data: lastSeasonRows, error: lastErr } = await supabase.from("last_season_match_stats").select("stats").eq("club_id", club.id);
  if (lastErr) throw new Error(`last_season_match_stats query failed: ${lastErr.message}`);

  const thisSeasonStats = (thisSeasonRows ?? []).map((r) => r.stats as TeamMatchStatsBlob);
  const lastSeasonStats = (lastSeasonRows ?? []).map((r) => r.stats as LastSeasonStatsBlob);

  return MATCH_STAT_MAPPINGS.map((m) => ({
    label: m.label,
    unit: m.unit,
    decimals: m.decimals,
    thisSeasonAvg: average(thisSeasonStats.map((s) => m.fromTeamMatchStats(s))),
    lastSeasonAvg: average(lastSeasonStats.map((s) => m.fromLastSeasonStats(s))),
  }));
}
