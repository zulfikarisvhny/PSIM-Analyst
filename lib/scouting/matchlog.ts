// lib/scouting/matchlog.ts
// Per-team round-by-round match log/formation, keyed by the team's full name
// (matching `Team` in liga_1_2026_2027). Add a new team by adding a key to
// MATCH_LOG_BY_TEAM + OWN_SHORT_BY_TEAM.

export interface MatchLogEntry {
  round: number;
  homeShort: string;
  awayShort: string;
  homeScore: number | null;
  awayScore: number | null;
  teamFormation: string; // this team's own formation, regardless of home/away
  oppFormation: string;
  result: "W" | "D" | "L";
}

export const TEAM_SHORT_TO_FULL: Record<string, string> = {
  Borneo: "Borneo FC Samarinda",
  PSM: "PSM Makassar",
  Arema: "Arema FC",
  Persis: "Persis Solo",
  "Madura Utd": "Madura United FC",
  Persik: "Persik Kediri",
  "Malut Utd": "Malut United FC",
  "Semen Padang": "Semen Padang FC",
  Persijap: "Persijap Jepara",
  Persita: "Persita Tangerang",
  PSS: "PSS Sleman",
  "Bali Utd": "Bali United FC",
  PSIM: "PSIM Yogyakarta",
  Persebaya: "Persebaya Surabaya",
  Persib: "Persib Bandung",
  "Dewa Utd": "Dewa United FC",
  PSBS: "PSBS Biak",
  Persija: "Persija Jakarta",
  Bhayangkara: "Bhayangkara Presisi FC",
};

/** Each team's own short name, as it appears in its own MATCH_LOG_BY_TEAM entries. */
export const OWN_SHORT_BY_TEAM: Record<string, string> = {
  "Bhayangkara Presisi FC": "Bhayangkara",
  "Persita Tangerang": "Persita",
  "Madura United FC": "Madura Utd",
};

// Transcribed from "Match Log Formation Bhayangkara FC.csv". Round 30 (vs
// Persib) is now known — result "D" per the Bhayangkara match-stats CSVs,
// exact score not tracked there either, so left null like Persita round 7.
const BHAYANGKARA_MATCH_LOG: MatchLogEntry[] = [
  { round: 1, homeShort: "Borneo", awayShort: "Bhayangkara", homeScore: 1, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-3-3", result: "L" },
  { round: 2, homeShort: "Bhayangkara", awayShort: "PSM", homeScore: 1, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "D" },
  { round: 3, homeShort: "Arema", awayShort: "Bhayangkara", homeScore: 2, awayScore: 1, teamFormation: "4-5-1", oppFormation: "4-2-3-1", result: "L" },
  { round: 4, homeShort: "Bhayangkara", awayShort: "Persis", homeScore: 2, awayScore: 0, teamFormation: "4-4-2", oppFormation: "4-1-4-1", result: "W" },
  { round: 5, homeShort: "Madura Utd", awayShort: "Bhayangkara", homeScore: 0, awayScore: 0, teamFormation: "4-4-2", oppFormation: "4-3-3", result: "D" },
  { round: 6, homeShort: "Bhayangkara", awayShort: "Persik", homeScore: 1, awayScore: 0, teamFormation: "4-3-3", oppFormation: "4-3-3", result: "W" },
  { round: 7, homeShort: "Bhayangkara", awayShort: "Malut Utd", homeScore: 0, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "L" },
  { round: 8, homeShort: "Persija", awayShort: "Bhayangkara", homeScore: 3, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "L" },
  { round: 9, homeShort: "Semen Padang", awayShort: "Bhayangkara", homeScore: 0, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-2-1-3", result: "W" },
  { round: 10, homeShort: "Bhayangkara", awayShort: "Persijap", homeScore: 2, awayScore: 0, teamFormation: "4-2-1-3", oppFormation: "4-3-3", result: "W" },
  { round: 11, homeShort: "Bhayangkara", awayShort: "Persita", homeScore: 1, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-4-2", result: "D" },
  { round: 12, homeShort: "Bhayangkara", awayShort: "Bali Utd", homeScore: 2, awayScore: 1, teamFormation: "4-1-4-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 13, homeShort: "PSIM", awayShort: "Bhayangkara", homeScore: 1, awayScore: 0, teamFormation: "4-1-4-1", oppFormation: "4-4-2", result: "L" },
  { round: 14, homeShort: "Bhayangkara", awayShort: "Persebaya", homeScore: 1, awayScore: 1, teamFormation: "4-4-2", oppFormation: "4-2-3-1", result: "D" },
  { round: 15, homeShort: "Persib", awayShort: "Bhayangkara", homeScore: 2, awayScore: 0, teamFormation: "4-1-4-1", oppFormation: "4-2-3-1", result: "L" },
  { round: 16, homeShort: "Bhayangkara", awayShort: "Dewa Utd", homeScore: 1, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-1-4-1", result: "W" },
  { round: 17, homeShort: "PSBS", awayShort: "Bhayangkara", homeScore: 4, awayScore: 1, teamFormation: "4-3-3", oppFormation: "3-4-1-2", result: "L" },
  { round: 18, homeShort: "Persita", awayShort: "Bhayangkara", homeScore: 1, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-4-2", result: "D" },
  { round: 19, homeShort: "Malut Utd", awayShort: "Bhayangkara", homeScore: 1, awayScore: 2, teamFormation: "4-1-4-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 20, homeShort: "Bhayangkara", awayShort: "Borneo", homeScore: 1, awayScore: 2, teamFormation: "4-3-3", oppFormation: "4-4-2", result: "L" },
  { round: 21, homeShort: "Persebaya", awayShort: "Bhayangkara", homeScore: 1, awayScore: 2, teamFormation: "4-2-1-3", oppFormation: "4-3-3", result: "W" },
  { round: 22, homeShort: "Persik", awayShort: "Bhayangkara", homeScore: 3, awayScore: 4, teamFormation: "4-2-3-1", oppFormation: "4-3-3", result: "W" },
  { round: 23, homeShort: "Bhayangkara", awayShort: "Semen Padang", homeScore: 4, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 24, homeShort: "Dewa Utd", awayShort: "Bhayangkara", homeScore: 0, awayScore: 2, teamFormation: "4-4-2", oppFormation: "5-4-1", result: "W" },
  { round: 25, homeShort: "Bhayangkara", awayShort: "Arema", homeScore: 2, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-2-3-1", result: "W" },
  { round: 26, homeShort: "Bhayangkara", awayShort: "Persija", homeScore: 3, awayScore: 2, teamFormation: "4-5-1", oppFormation: "3-4-3", result: "W" },
  { round: 27, homeShort: "Persijap", awayShort: "Bhayangkara", homeScore: 2, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-4-2", result: "L" },
  { round: 28, homeShort: "Bhayangkara", awayShort: "PSIM", homeScore: 2, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 29, homeShort: "Persis", awayShort: "Bhayangkara", homeScore: 2, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-3-3", result: "L" },
  { round: 30, homeShort: "Bhayangkara", awayShort: "Persib", homeScore: null, awayScore: null, teamFormation: "4-2-3-1", oppFormation: "4-1-4-1", result: "D" },
  { round: 31, homeShort: "PSM", awayShort: "Bhayangkara", homeScore: 2, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-3-3", result: "L" },
  { round: 32, homeShort: "Bhayangkara", awayShort: "Madura Utd", homeScore: 3, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-3-2-1", result: "W" },
  { round: 33, homeShort: "Bali Utd", awayShort: "Bhayangkara", homeScore: 4, awayScore: 1, teamFormation: "4-4-2", oppFormation: "4-4-2", result: "L" },
  { round: 34, homeShort: "Bhayangkara", awayShort: "PSBS", homeScore: 7, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "5-4-1", result: "W" },
];

// Transcribed from "Match Log Persita.csv". Formation column there is
// always Persita's own formation regardless of home/away, matching the
// Bhayangkara convention above. Round 7 (vs Persib) has no recorded score
// ("?") and the Match Log's own Result cell was blank — result "D" backfilled
// from "Persita all team stats.csv", which has the same round with a known
// Result but the same unresolved "? - ?" score.
const PERSITA_MATCH_LOG: MatchLogEntry[] = [
  { round: 1, homeShort: "Persija", awayShort: "Persita", homeScore: 4, awayScore: 0, teamFormation: "4-2-1-3", oppFormation: "4-4-2", result: "L" },
  { round: 2, homeShort: "Persita", awayShort: "Persebaya", homeScore: 0, awayScore: 1, teamFormation: "4-4-2", oppFormation: "4-4-2", result: "L" },
  { round: 3, homeShort: "Madura Utd", awayShort: "Persita", homeScore: 1, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-3-3", result: "D" },
  { round: 4, homeShort: "Persita", awayShort: "Semen Padang", homeScore: 2, awayScore: 0, teamFormation: "4-2-1-3", oppFormation: "4-3-3", result: "W" },
  { round: 5, homeShort: "Persita", awayShort: "PSM", homeScore: 2, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 6, homeShort: "Persijap", awayShort: "Persita", homeScore: 1, awayScore: 2, teamFormation: "4-2-3-1", oppFormation: "4-4-2", result: "W" },
  { round: 7, homeShort: "Persita", awayShort: "Persib", homeScore: null, awayScore: null, teamFormation: "4-3-3", oppFormation: "4-2-1-3", result: "D" },
  { round: 8, homeShort: "Arema", awayShort: "Persita", homeScore: 0, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-5-1", result: "W" },
  { round: 9, homeShort: "Persita", awayShort: "PSIM", homeScore: 4, awayScore: 0, teamFormation: "4-3-3", oppFormation: "4-1-4-1", result: "W" },
  { round: 10, homeShort: "Bali Utd", awayShort: "Persita", homeScore: 0, awayScore: 0, teamFormation: "4-2-1-3", oppFormation: "4-1-4-1", result: "D" },
  { round: 11, homeShort: "Bhayangkara", awayShort: "Persita", homeScore: 1, awayScore: 1, teamFormation: "4-4-2", oppFormation: "4-3-3", result: "D" },
  { round: 12, homeShort: "PSBS", awayShort: "Persita", homeScore: 2, awayScore: 1, teamFormation: "4-3-3", oppFormation: "4-2-3-1", result: "L" },
  { round: 13, homeShort: "Persita", awayShort: "Malut Utd", homeScore: 0, awayScore: 0, teamFormation: "4-4-2", oppFormation: "4-2-3-1", result: "D" },
  { round: 14, homeShort: "Dewa Utd", awayShort: "Persita", homeScore: 1, awayScore: 0, teamFormation: "4-4-2", oppFormation: "4-3-3", result: "L" },
  { round: 15, homeShort: "Persita", awayShort: "Persik", homeScore: 3, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 16, homeShort: "Persis", awayShort: "Persita", homeScore: 1, awayScore: 3, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "W" },
  { round: 17, homeShort: "Persita", awayShort: "Borneo", homeScore: 2, awayScore: 0, teamFormation: "4-4-2", oppFormation: "4-3-3", result: "W" },
  { round: 18, homeShort: "Persita", awayShort: "Bhayangkara", homeScore: 1, awayScore: 1, teamFormation: "4-4-2", oppFormation: "4-3-3", result: "D" },
  { round: 19, homeShort: "Persita", awayShort: "Persija", homeScore: 0, awayScore: 2, teamFormation: "4-4-2", oppFormation: "4-2-3-1", result: "L" },
  { round: 20, homeShort: "Semen Padang", awayShort: "Persita", homeScore: 1, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "L" },
  { round: 21, homeShort: "Persita", awayShort: "PSBS", homeScore: 2, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "5-3-2", result: "W" },
  { round: 22, homeShort: "Persib", awayShort: "Persita", homeScore: 1, awayScore: 0, teamFormation: "4-4-2", oppFormation: "4-1-4-1", result: "L" },
  { round: 23, homeShort: "Persita", awayShort: "Dewa Utd", homeScore: 0, awayScore: 1, teamFormation: "4-4-2", oppFormation: "4-2-3-1", result: "L" },
  { round: 24, homeShort: "PSM", awayShort: "Persita", homeScore: 2, awayScore: 4, teamFormation: "4-3-3", oppFormation: "4-4-2", result: "W" },
  { round: 25, homeShort: "Persita", awayShort: "Madura Utd", homeScore: 4, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-4-2", result: "W" },
  { round: 26, homeShort: "Persebaya", awayShort: "Persita", homeScore: 1, awayScore: 0, teamFormation: "4-2-1-3", oppFormation: "4-3-3", result: "L" },
  { round: 27, homeShort: "Persita", awayShort: "Arema", homeScore: 0, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "5-4-1", result: "L" },
  { round: 28, homeShort: "Persik", awayShort: "Persita", homeScore: 1, awayScore: 0, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "L" },
  { round: 29, homeShort: "Persita", awayShort: "Bali Utd", homeScore: 0, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-4-2", result: "L" },
  { round: 30, homeShort: "PSIM", awayShort: "Persita", homeScore: 0, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-1-4-1", result: "W" },
  { round: 31, homeShort: "Borneo", awayShort: "Persita", homeScore: 2, awayScore: 0, teamFormation: "4-1-3-2", oppFormation: "4-3-3", result: "L" },
  { round: 32, homeShort: "Persita", awayShort: "Persijap", homeScore: 0, awayScore: 3, teamFormation: "4-3-3", oppFormation: "4-2-3-1", result: "L" },
  { round: 33, homeShort: "Malut Utd", awayShort: "Persita", homeScore: 1, awayScore: 1, teamFormation: "4-2-3-1", oppFormation: "4-2-3-1", result: "D" },
  { round: 34, homeShort: "Persita", awayShort: "Persis", homeScore: 1, awayScore: 3, teamFormation: "4-2-3-1", oppFormation: "4-4-2", result: "L" },
];

// Transcribed from Lapangbola match report PDFs. Formations aren't printed
// as a labeled string in those reports (only the on-pitch dot layout), so
// left blank for now rather than guessed.
const MADURA_MATCH_LOG: MatchLogEntry[] = [
  { round: 1, homeShort: "Madura Utd", awayShort: "Persijap", homeScore: 2, awayScore: 0, teamFormation: "", oppFormation: "", result: "W" },
  { round: 2, homeShort: "PSS", awayShort: "Madura Utd", homeScore: 1, awayScore: 3, teamFormation: "", oppFormation: "", result: "W" },
];

export const MATCH_LOG_BY_TEAM: Record<string, MatchLogEntry[]> = {
  "Bhayangkara Presisi FC": BHAYANGKARA_MATCH_LOG,
  "Persita Tangerang": PERSITA_MATCH_LOG,
  "Madura United FC": MADURA_MATCH_LOG,
};

export function opponentOf(
  entry: MatchLogEntry,
  ownShort: string
): {
  opponentShort: string;
  venue: "H" | "A";
  teamScore: number | null;
  oppScore: number | null;
  teamFormation: string;
  oppFormation: string;
} {
  const isHome = entry.homeShort === ownShort;
  return {
    opponentShort: isHome ? entry.awayShort : entry.homeShort,
    venue: isHome ? "H" : "A",
    teamScore: isHome ? entry.homeScore : entry.awayScore,
    oppScore: isHome ? entry.awayScore : entry.homeScore,
    teamFormation: entry.teamFormation,
    oppFormation: entry.oppFormation,
  };
}
