// lib/scouting/types.ts

export interface LeagueTeamRow {
  Team: string;
  Style: string;
  Defense: string;
  Physical: string;
  MP: number;
  W: number;
  D: number;
  L: number;
  club_id: number | null;
  logo_url: string | null;

  // style-map metrics
  "Poss %": number;
  "Poss % (Neutral)": number;
  "Direct %": number;
  "Territory %": number;
  "Pass Acc %": number;
  "xG/Shot": number;
  "KP/Shot": number;
  "Proactive Def %": number;
  "Step-Out %": number;
  "Aerial %": number;

  // per-match aggregate stats (subset — extend as needed)
  passes: number;
  acc_passes: number;
  goals: number;
  xg: number;
  opp_goals: number;
  opp_xg: number;
  key_passes: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  blocked_shots: number;
  duels_won: number;
  duels_lost: number;
  aerial_duels_won: number;
  aerial_duels_lost: number;
  fouls_committed: number;
  fouls_drawn: number;
  shots: number;
  opp_shots: number;
  shots_on_target: number;
}

export interface RadarPercentiles {
  xg: number;
  goals: number;
  territory: number;
  tackles_int: number;
  solidity: number;
  possession: number;
  pass_acc: number;
}

export const RADAR_AXES: (keyof RadarPercentiles)[] = [
  "xg", "goals", "territory", "possession", "pass_acc", "tackles_int", "solidity",
];

export const RADAR_LABELS: Record<keyof RadarPercentiles, string> = {
  xg: "Chance Quality (xG/Shot)",
  goals: "Sharpness (Goals/Match)",
  territory: "Territory (%)",
  tackles_int: "Pressing (Tackles+Interceptions)",
  solidity: "Defensive Solidity",
  possession: "Possession (%)",
  pass_acc: "Pass Accuracy (%)",
};
