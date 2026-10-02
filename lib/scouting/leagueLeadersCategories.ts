// lib/scouting/leagueLeadersCategories.ts
// Client-safe: the row shape and the stat-category catalog for League
// Leaders, with no server-only imports — leagueLeaders.ts (the actual
// Supabase fetch, which needs next/headers) stays separate so the client
// board component doesn't drag a server-only module into its bundle.
export interface LeagueLeaderRawRow {
  playerId: number;
  name: string;
  team: string;
  logoUrl: string | null;
  photoUrl: string | null;
  position: string | null;
  positionBucket: string | null;
  age: number | null;
  isLocal: boolean | null;
  matchesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  // raw counts
  shots: number | null;
  nonPenaltyGoals: number | null;
  headGoals: number | null;
  penaltiesTaken: number | null;
  yellowCards: number | null;
  redCards: number | null;
  cleanSheets: number | null;
  concededGoals: number | null;
  shotsAgainst: number | null;
  preventedGoals: number | null;
  // percentages
  shotsOnTargetPct: number | null;
  goalConversionPct: number | null;
  accuratePassesPct: number | null;
  accurateLongPassesPct: number | null;
  accurateCrossesPct: number | null;
  defensiveDuelsWonPct: number | null;
  offensiveDuelsWonPct: number | null;
  aerialDuelsWonPct: number | null;
  duelsWonPct: number | null;
  successfulDribblesPct: number | null;
  saveRatePct: number | null;
  // per-90 rates (converted to season totals via minutesPlayed)
  passesPer90: number | null;
  keyPassesPer90: number | null;
  smartPassesPer90: number | null;
  throughPassesPer90: number | null;
  longPassesPer90: number | null;
  progressivePassesPer90: number | null;
  passesToFinalThirdPer90: number | null;
  passesToPenaltyAreaPer90: number | null;
  crossesPer90: number | null;
  deepCompletionsPer90: number | null;
  shotAssistsPer90: number | null;
  secondAssistsPer90: number | null;
  touchesInBoxPer90: number | null;
  interceptionsPer90: number | null;
  slidingTacklesPer90: number | null;
  defensiveDuelsPer90: number | null;
  foulsPer90: number | null;
  foulsSufferedPer90: number | null;
  dribblesPer90: number | null;
  duelsPer90: number | null;
  offensiveDuelsPer90: number | null;
  aerialDuelsPer90: number | null;
  progressiveRunsPer90: number | null;
  accelerationsPer90: number | null;
}

// player_season_stats.position is Wyscout's own detailed code list, primary
// position first (e.g. "LAMF, LWB, LW") — bucketed here, by the primary code
// only, into the broad GK-through-CF groups the position picker shows.
export const POSITION_BUCKETS = ["GK", "CB", "FB", "DM", "CM", "AM", "W", "CF"] as const;
export type PositionBucket = (typeof POSITION_BUCKETS)[number];

const BUCKET_BY_CODE: Record<string, PositionBucket> = {
  GK: "GK",
  CB: "CB",
  LCB: "CB",
  RCB: "CB",
  LB: "FB",
  RB: "FB",
  LWB: "FB",
  RWB: "FB",
  DMF: "DM",
  LDMF: "DM",
  RDMF: "DM",
  CMF: "CM",
  LCMF: "CM",
  RCMF: "CM",
  AMF: "AM",
  LAMF: "AM",
  RAMF: "AM",
  LW: "W",
  RW: "W",
  LWF: "W",
  RWF: "W",
  CF: "CF",
};

export function bucketPosition(rawPosition: string | null): PositionBucket | null {
  if (!rawPosition) return null;
  const primary = rawPosition.split(",")[0]?.trim();
  return BUCKET_BY_CODE[primary] ?? null;
}

export type StatGroup = "Attacking" | "Creating" | "Passing" | "Defending" | "Dribbling & Duels" | "Goalkeeping" | "Discipline";

export interface StatCategory {
  key: string;
  label: string;
  group: StatGroup;
  decimals: number;
  suffix?: string;
  compute: (r: LeagueLeaderRawRow) => number | null;
}

/** A per-90 rate's total over the minutes actually played — matches how these are normally reported as a season count, not a rate. */
function toTotal(per90: number | null, minutes: number): number | null {
  if (per90 === null) return null;
  return Math.round((per90 * minutes) / 90);
}

export const STAT_CATEGORIES: StatCategory[] = [
  // Attacking
  { key: "goals", label: "Goals", group: "Attacking", decimals: 0, compute: (r) => r.goals },
  { key: "non_penalty_goals", label: "Non-Penalty Goals", group: "Attacking", decimals: 0, compute: (r) => r.nonPenaltyGoals },
  { key: "head_goals", label: "Head Goals", group: "Attacking", decimals: 0, compute: (r) => r.headGoals },
  { key: "shots", label: "Shots", group: "Attacking", decimals: 0, compute: (r) => r.shots },
  { key: "shots_on_target_pct", label: "Shots on Target %", group: "Attacking", decimals: 1, suffix: "%", compute: (r) => r.shotsOnTargetPct },
  { key: "goal_conversion_pct", label: "Goal Conversion %", group: "Attacking", decimals: 1, suffix: "%", compute: (r) => r.goalConversionPct },
  { key: "xg", label: "xG", group: "Attacking", decimals: 2, compute: (r) => r.xg },
  { key: "penalties_taken", label: "Penalties Taken", group: "Attacking", decimals: 0, compute: (r) => r.penaltiesTaken },

  // Creating
  { key: "assists", label: "Assists", group: "Creating", decimals: 0, compute: (r) => r.assists },
  { key: "xa", label: "xA", group: "Creating", decimals: 2, compute: (r) => r.xa },
  { key: "key_passes", label: "Key Passes", group: "Creating", decimals: 0, compute: (r) => toTotal(r.keyPassesPer90, r.minutesPlayed) },
  { key: "shot_assists", label: "Shot Assists", group: "Creating", decimals: 0, compute: (r) => toTotal(r.shotAssistsPer90, r.minutesPlayed) },
  { key: "second_assists", label: "Second Assists", group: "Creating", decimals: 0, compute: (r) => toTotal(r.secondAssistsPer90, r.minutesPlayed) },
  { key: "smart_passes", label: "Smart Passes", group: "Creating", decimals: 0, compute: (r) => toTotal(r.smartPassesPer90, r.minutesPlayed) },
  { key: "through_passes", label: "Through Passes", group: "Creating", decimals: 0, compute: (r) => toTotal(r.throughPassesPer90, r.minutesPlayed) },
  { key: "touches_in_box", label: "Touches in Box", group: "Creating", decimals: 0, compute: (r) => toTotal(r.touchesInBoxPer90, r.minutesPlayed) },

  // Passing
  { key: "total_passes", label: "Total Passes", group: "Passing", decimals: 0, compute: (r) => toTotal(r.passesPer90, r.minutesPlayed) },
  { key: "accurate_passes_pct", label: "Accurate Passes %", group: "Passing", decimals: 1, suffix: "%", compute: (r) => r.accuratePassesPct },
  { key: "long_balls", label: "Long Balls", group: "Passing", decimals: 0, compute: (r) => toTotal(r.longPassesPer90, r.minutesPlayed) },
  { key: "accurate_long_passes_pct", label: "Accurate Long Passes %", group: "Passing", decimals: 1, suffix: "%", compute: (r) => r.accurateLongPassesPct },
  { key: "progressive_passes", label: "Progressive Passes", group: "Passing", decimals: 0, compute: (r) => toTotal(r.progressivePassesPer90, r.minutesPlayed) },
  { key: "passes_to_final_third", label: "Passes to Final Third", group: "Passing", decimals: 0, compute: (r) => toTotal(r.passesToFinalThirdPer90, r.minutesPlayed) },
  { key: "passes_to_penalty_area", label: "Passes to Penalty Area", group: "Passing", decimals: 0, compute: (r) => toTotal(r.passesToPenaltyAreaPer90, r.minutesPlayed) },
  { key: "crosses", label: "Crosses", group: "Passing", decimals: 0, compute: (r) => toTotal(r.crossesPer90, r.minutesPlayed) },
  { key: "accurate_crosses_pct", label: "Accurate Crosses %", group: "Passing", decimals: 1, suffix: "%", compute: (r) => r.accurateCrossesPct },
  { key: "deep_completions", label: "Deep Completions", group: "Passing", decimals: 0, compute: (r) => toTotal(r.deepCompletionsPer90, r.minutesPlayed) },

  // Defending
  { key: "interceptions", label: "Interceptions", group: "Defending", decimals: 0, compute: (r) => toTotal(r.interceptionsPer90, r.minutesPlayed) },
  { key: "sliding_tackles", label: "Tackles", group: "Defending", decimals: 0, compute: (r) => toTotal(r.slidingTacklesPer90, r.minutesPlayed) },
  { key: "defensive_duels", label: "Defensive Duels", group: "Defending", decimals: 0, compute: (r) => toTotal(r.defensiveDuelsPer90, r.minutesPlayed) },
  { key: "defensive_duels_won_pct", label: "Defensive Duels Won %", group: "Defending", decimals: 1, suffix: "%", compute: (r) => r.defensiveDuelsWonPct },
  { key: "fouls", label: "Fouls", group: "Defending", decimals: 0, compute: (r) => toTotal(r.foulsPer90, r.minutesPlayed) },
  { key: "fouls_suffered", label: "Fouls Suffered", group: "Defending", decimals: 0, compute: (r) => toTotal(r.foulsSufferedPer90, r.minutesPlayed) },

  // Dribbling & Duels
  { key: "dribbles", label: "Dribbles", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.dribblesPer90, r.minutesPlayed) },
  { key: "successful_dribbles_pct", label: "Successful Dribbles %", group: "Dribbling & Duels", decimals: 1, suffix: "%", compute: (r) => r.successfulDribblesPct },
  { key: "duels", label: "Duels", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.duelsPer90, r.minutesPlayed) },
  { key: "duels_won_pct", label: "Duels Won %", group: "Dribbling & Duels", decimals: 1, suffix: "%", compute: (r) => r.duelsWonPct },
  { key: "offensive_duels", label: "Offensive Duels", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.offensiveDuelsPer90, r.minutesPlayed) },
  { key: "offensive_duels_won_pct", label: "Offensive Duels Won %", group: "Dribbling & Duels", decimals: 1, suffix: "%", compute: (r) => r.offensiveDuelsWonPct },
  { key: "aerial_duels", label: "Aerial Duels", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.aerialDuelsPer90, r.minutesPlayed) },
  { key: "aerial_duels_won_pct", label: "Aerial Duels Won %", group: "Dribbling & Duels", decimals: 1, suffix: "%", compute: (r) => r.aerialDuelsWonPct },
  { key: "progressive_runs", label: "Progressive Runs", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.progressiveRunsPer90, r.minutesPlayed) },
  { key: "accelerations", label: "Accelerations", group: "Dribbling & Duels", decimals: 0, compute: (r) => toTotal(r.accelerationsPer90, r.minutesPlayed) },

  // Goalkeeping
  { key: "clean_sheets", label: "Clean Sheets", group: "Goalkeeping", decimals: 0, compute: (r) => r.cleanSheets },
  { key: "conceded_goals", label: "Conceded Goals", group: "Goalkeeping", decimals: 0, compute: (r) => r.concededGoals },
  { key: "save_rate_pct", label: "Save Rate %", group: "Goalkeeping", decimals: 1, suffix: "%", compute: (r) => r.saveRatePct },
  { key: "shots_against", label: "Shots Against", group: "Goalkeeping", decimals: 0, compute: (r) => r.shotsAgainst },
  { key: "prevented_goals", label: "Prevented Goals", group: "Goalkeeping", decimals: 2, compute: (r) => r.preventedGoals },

  // Discipline
  { key: "yellow_cards", label: "Yellow Cards", group: "Discipline", decimals: 0, compute: (r) => r.yellowCards },
  { key: "red_cards", label: "Red Cards", group: "Discipline", decimals: 0, compute: (r) => r.redCards },
];
