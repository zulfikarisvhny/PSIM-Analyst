// lib/physicalStats/matchPlayerName.ts
// Client-safe. Matches a Catapult report's FULL-CAPS player name (e.g.
// "YUSAKU YAMADERA", "Jop Van der Arvert") against the `players` table's
// abbreviated-name convention (e.g. "Y. Yamadera", "J. van der Avert" — note
// spelling can differ slightly between the two data sources). Best-effort:
// callers should let the user confirm/override the match, not trust it blindly.
export interface PlayerOption {
  id: number;
  name: string;
}

export interface PlayerMatch {
  playerId: number | null;
  matchedName: string | null;
  confidence: "exact" | "surname" | "fuzzy" | "none";
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (é -> e)
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance, for tolerating small spelling differences (Arvert vs Avert). */
function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function matchPlayerName(catapultName: string, roster: PlayerOption[]): PlayerMatch {
  const target = normalize(catapultName);
  const targetWords = target.split(" ");
  const targetSurname = targetWords[targetWords.length - 1];

  // 1. Exact full-name match (normalized).
  const exact = roster.find((p) => normalize(p.name) === target);
  if (exact) return { playerId: exact.id, matchedName: exact.name, confidence: "exact" };

  // 2. Surname match — the last word of both names, exact.
  const surnameMatches = roster.filter((p) => {
    const words = normalize(p.name).split(" ");
    return words[words.length - 1] === targetSurname;
  });
  if (surnameMatches.length === 1) {
    return { playerId: surnameMatches[0].id, matchedName: surnameMatches[0].name, confidence: "surname" };
  }

  // 3. Fuzzy — surname within edit distance 2 (typos/spelling differences like "Arvert" vs "Avert"),
  // only accepted if exactly one roster player is close enough.
  const fuzzyCandidates = roster
    .map((p) => {
      const words = normalize(p.name).split(" ");
      const surname = words[words.length - 1];
      return { player: p, distance: editDistance(surname, targetSurname) };
    })
    .filter((c) => c.distance <= 2)
    .sort((a, b) => a.distance - b.distance);
  if (fuzzyCandidates.length > 0 && (fuzzyCandidates.length === 1 || fuzzyCandidates[0].distance < fuzzyCandidates[1].distance)) {
    const best = fuzzyCandidates[0].player;
    return { playerId: best.id, matchedName: best.name, confidence: "fuzzy" };
  }

  return { playerId: null, matchedName: null, confidence: "none" };
}
