// lib/scouting/matchStatMapping.ts
// Client-safe. team_match_stats.stats (from PDF match reports) and
// last_season_match_stats.stats (from the xlsx-derived pipeline) describe
// mostly the same things but with different key names AND different value
// shapes: team_match_stats values are strings like "517/436 84%" (Wyscout's
// combined total/accurate/pct format); last_season_match_stats values are
// already separate numbers ("..._total", "..._success", "..._pct"). Only 6
// keys are byte-identical between the two (clearances, goals, interceptions,
// match_tempo, offsides, xg) — everything else needs this mapping + an
// extractor to pull a single comparable number out of each side.
export type TeamMatchStatsBlob = Record<string, string>;
export type LastSeasonStatsBlob = Record<string, number>;

function parseFirst(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/^-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function parseSecond(raw: string | undefined): number | null {
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length < 2) return null;
  const m = parts[1].match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function parsePct(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+(\.\d+)?)%/);
  return m ? Number(m[1]) : null;
}
function num(v: number | undefined): number | null {
  return typeof v === "number" ? v : null;
}

export interface MatchStatMapping {
  label: string;
  unit?: string;
  decimals: number;
  fromTeamMatchStats: (stats: TeamMatchStatsBlob) => number | null;
  fromLastSeasonStats: (stats: LastSeasonStatsBlob) => number | null;
}

export const MATCH_STAT_MAPPINGS: MatchStatMapping[] = [
  { label: "PPDA", decimals: 1, fromTeamMatchStats: (s) => parseFirst(s.passes_allowed_per_def_action_ppda), fromLastSeasonStats: (s) => num(s.ppda) },
  { label: "Clearances", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.clearances), fromLastSeasonStats: (s) => num(s.clearances) },
  { label: "Interceptions", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.interceptions), fromLastSeasonStats: (s) => num(s.interceptions) },
  { label: "Offsides", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.offsides), fromLastSeasonStats: (s) => num(s.offsides) },
  { label: "Match Tempo", decimals: 1, fromTeamMatchStats: (s) => parseFirst(s.match_tempo), fromLastSeasonStats: (s) => num(s.match_tempo) },
  { label: "Pass Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.total_passes_accurate), fromLastSeasonStats: (s) => num(s.passes_accurate_pct) },
  { label: "Forward Passes Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.forward_passes_accurate), fromLastSeasonStats: (s) => num(s.forward_passes_accurate_pct) },
  { label: "Back Passes Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.back_passes_accurate), fromLastSeasonStats: (s) => num(s.back_passes_accurate_pct) },
  { label: "Lateral Passes Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.lateral_passes_accurate), fromLastSeasonStats: (s) => num(s.lateral_passes_accurate_pct) },
  { label: "Long Passes Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.long_passes_accurate), fromLastSeasonStats: (s) => num(s.long_passes_accurate_pct) },
  { label: "Progressive Passes Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.progressive_passes_accurate), fromLastSeasonStats: (s) => num(s.progressive_passes_accurate_pct) },
  { label: "Passes to Final Third Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.passes_to_final_third_accurate), fromLastSeasonStats: (s) => num(s.passes_to_final_third_accurate_pct) },
  { label: "Crosses Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.crosses_accurate), fromLastSeasonStats: (s) => num(s.crosses_accurate_pct) },
  { label: "Duels Won", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.total_duels_won), fromLastSeasonStats: (s) => num(s.duels_won_pct) },
  { label: "Offensive Duels Won", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.offensive_duels_won), fromLastSeasonStats: (s) => num(s.offensive_duels_won_pct) },
  { label: "Defensive Duels Won", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.defensive_duels_won), fromLastSeasonStats: (s) => num(s.defensive_duels_won_pct) },
  { label: "Aerial Duels Won", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.aerial_duels_won), fromLastSeasonStats: (s) => num(s.aerial_duels_won_pct) },
  { label: "Shots on Target", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.shots_on_target), fromLastSeasonStats: (s) => num(s.shots_on_target_total) },
  { label: "Average Shot Distance", unit: "m", decimals: 1, fromTeamMatchStats: (s) => parseFirst(s.average_shot_distance_m), fromLastSeasonStats: (s) => num(s.average_shot_distance) },
  { label: "Average Pass Length", unit: "m", decimals: 1, fromTeamMatchStats: (s) => parseFirst(s.average_pass_length_m), fromLastSeasonStats: (s) => num(s.average_pass_length) },
  { label: "Deep Completions", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.deep_completions), fromLastSeasonStats: (s) => num(s.deep_completed_passes) },
  { label: "Yellow Cards", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.yellow_red_cards), fromLastSeasonStats: (s) => num(s.yellow_cards) },
  { label: "Red Cards", decimals: 0, fromTeamMatchStats: (s) => parseSecond(s.yellow_red_cards), fromLastSeasonStats: (s) => num(s.red_cards) },
  { label: "Recoveries", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.recoveries_low_medium_high), fromLastSeasonStats: (s) => num(s.recoveries_total) },
  { label: "Losses", decimals: 0, fromTeamMatchStats: (s) => parseFirst(s.losses_low_medium_high), fromLastSeasonStats: (s) => num(s.losses_total) },
  { label: "Corners with Shots", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.corners_with_shots), fromLastSeasonStats: (s) => num(s.corners_with_shots_pct) },
  { label: "Free Kicks with Shots", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.free_kicks_with_shots), fromLastSeasonStats: (s) => num(s.free_kicks_with_shots_pct) },
  { label: "Positional Attacks with Shots", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.positional_attacks_with_shots), fromLastSeasonStats: (s) => num(s.positional_attacks_with_shots_pct) },
  { label: "Smart Passes Accuracy", unit: "%", decimals: 1, fromTeamMatchStats: (s) => parsePct(s.smart_passes_accurate), fromLastSeasonStats: (s) => num(s.smart_passes_accurate_pct) },
];
