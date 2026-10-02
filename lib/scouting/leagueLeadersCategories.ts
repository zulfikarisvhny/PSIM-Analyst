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
  matchesInvolved: number;
  goals: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  crosses: number;
  losses: number;
  recoveries: number;
  totalPasses: number;
  yellowCards: number;
  redCards: number;
}

export type StatGroup = "Attacking" | "Passing" | "Defending" | "Discipline";

export interface StatCategory {
  key: string;
  label: string;
  group: StatGroup;
  decimals: number;
  suffix?: string;
  compute: (r: LeagueLeaderRawRow) => number | null;
}

export const STAT_CATEGORIES: StatCategory[] = [
  { key: "goals", label: "Goals", group: "Attacking", decimals: 0, compute: (r) => r.goals },
  { key: "shots", label: "Shots", group: "Attacking", decimals: 0, compute: (r) => r.shots },
  {
    key: "shots_on_target_pct",
    label: "Shots on Target %",
    group: "Attacking",
    decimals: 1,
    suffix: "%",
    compute: (r) => (r.shots > 0 ? (r.shotsOnTarget / r.shots) * 100 : null),
  },
  { key: "key_passes", label: "Key Passes", group: "Attacking", decimals: 0, compute: (r) => r.keyPasses },
  { key: "crosses", label: "Crosses", group: "Attacking", decimals: 0, compute: (r) => r.crosses },

  { key: "total_passes", label: "Total Passes", group: "Passing", decimals: 0, compute: (r) => r.totalPasses },

  { key: "recoveries", label: "Recoveries", group: "Defending", decimals: 0, compute: (r) => r.recoveries },
  { key: "losses", label: "Losses", group: "Defending", decimals: 0, compute: (r) => r.losses },

  { key: "yellow_cards", label: "Yellow Cards", group: "Discipline", decimals: 0, compute: (r) => r.yellowCards },
  { key: "red_cards", label: "Red Cards", group: "Discipline", decimals: 0, compute: (r) => r.redCards },
];
