// lib/scouting/friendlies.ts
// Pre-season/friendly ("uji coba") matches — kept separate from
// MATCH_LOG_BY_TEAM (lib/scouting/matchlog.ts) because those are official
// league rounds; mixing friendlies in would skew win/draw/loss counts and
// formation win-rates computed from that log.

export interface FriendlyMatch {
  opponent: string;
  teamScore: number;
  oppScore: number;
  /** null = date not yet confirmed (TBC). */
  date: string | null;
  result: "W" | "D" | "L";
}

export const FRIENDLIES_BY_TEAM: Record<string, FriendlyMatch[]> = {
  "Persita Tangerang": [
    { opponent: "Persik Kediri", teamScore: 1, oppScore: 0, date: null, result: "W" },
    { opponent: "PSM Makassar", teamScore: 1, oppScore: 3, date: "2026-08-11", result: "L" },
    { opponent: "PSS Sleman", teamScore: 1, oppScore: 1, date: "2026-08-15", result: "D" },
  ],
};
