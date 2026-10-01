// lib/scouting/queries.ts
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { LeagueTeamRow, RadarPercentiles, RADAR_AXES } from "./types";

// Reuse your existing Supabase client instance/config from the rest of nexus-web
// instead of creating a new one here if you already have lib/supabase.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TABLE = "liga_1_2026_2027";

/** Fetch every team row from the league table, sorted by points desc. Wrapped in
 * React's cache() so the root layout (sidebar logo) and a page both calling this
 * in the same request only hit Supabase once. */
export const fetchLeagueTable = cache(async (): Promise<LeagueTeamRow[]> => {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) throw error;

  // PTS isn't a stored column — derive it, then sort
  return (data as LeagueTeamRow[]).sort((a, b) => {
    const ptsA = a.W * 3 + a.D;
    const ptsB = b.W * 3 + b.D;
    return ptsB - ptsA;
  });
});

/** Fetch a single team's row by exact name. */
export async function fetchTeam(teamName: string): Promise<LeagueTeamRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("Team", teamName)
    .single();
  if (error) return null;
  return data as LeagueTeamRow;
}

function percentileRank(values: number[], value: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = sorted.indexOf(value);
  return Math.round((idx / (sorted.length - 1)) * 1000) / 10;
}

/**
 * Compute league-wide percentile ranks (0-100) for every team across the
 * radar axes. Call once per page load with the full league table, then
 * look up percentiles per team from the returned map.
 */
export function computeRadarPercentiles(
  rows: LeagueTeamRow[]
): Record<string, RadarPercentiles> {
  const perMatch = (row: LeagueTeamRow) => ({
    xg: row["xG/Shot"],
    goals: row.goals / row.MP,
    territory: row["Territory %"],
    tackles_int: (row.tackles + row.interceptions) / row.MP,
    opp_goals: row.opp_goals / row.MP,
    possession: row["Poss %"],
    pass_acc: row["Pass Acc %"],
  });

  const derived = rows.map((r) => ({ team: r.Team, ...perMatch(r) }));

  const result: Record<string, RadarPercentiles> = {};
  for (const d of derived) {
    result[d.team] = {
      xg: percentileRank(derived.map((x) => x.xg), d.xg),
      goals: percentileRank(derived.map((x) => x.goals), d.goals),
      territory: percentileRank(derived.map((x) => x.territory), d.territory),
      tackles_int: percentileRank(derived.map((x) => x.tackles_int), d.tackles_int),
      // invert: lowest conceded -> highest solidity score
      solidity: percentileRank(
        derived.map((x) => -x.opp_goals),
        -d.opp_goals
      ),
      possession: percentileRank(derived.map((x) => x.possession), d.possession),
      pass_acc: percentileRank(derived.map((x) => x.pass_acc), d.pass_acc),
    };
  }
  return result;
}