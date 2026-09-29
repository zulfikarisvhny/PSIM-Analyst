// lib/matchReport/parseMatchReport.ts
// TypeScript port of extract-PDF/extract_match_report.py's parsing logic, so
// the browser-upload flow doesn't depend on a Python process server-side.
// Keep the two in sync: same TEAM_STATS_LABELS, same slug(), same row-split
// ("half the tokens are the home team's, half are the away team's").
import { TEAM_STATS_LABELS, slug } from "./labels";
import { loadPdfjs, getPageItems, groupRows, type TextItem } from "../pdf/textLayout";
import { parseTimeSegments, type TimeSegmentsResult } from "./parseTimeSegments";
import { extractPatternFills } from "./resolveChartColors";
import { extractIconFills, classifyMarkerIcon, type IconFill } from "./resolveIconColors";
import { parseMatchEvents, parseStartingLineups, type MatchEvent, type StartingPlayer } from "./parseMatchEvents";
import { parseAveragePositions, type AveragePosition } from "./parseAveragePositions";
import { parsePassCombinationPage, type TeamPassSummary } from "./parsePassCombinations";
import { parseShots, type ShotEvent } from "./parseShots";
import { parseEventScatterPage, type ScatterEvent } from "./parseEventScatterPage";
import { extractPathBoxes, findEventDiagramBoxes } from "./resolvePathBoxes";
import { parseFormationLineups, type FormationSlot } from "./parseFormationLineups";

export interface MatchReportMeta {
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string | null; // dd/mm/yyyy, as printed
  matchDateIso: string | null; // yyyy-mm-dd
  competition: string | null;
  round: string | null;
  durationMinutes: number | null; // final-whistle minute (includes stoppage time), from the POSITIONS page
}

export interface ExtractedMatchReport {
  meta: MatchReportMeta;
  teamStatsHome: Record<string, string>;
  teamStatsAway: Record<string, string>;
  homeScheme: string | null; // e.g. "4-2-3-1 (100.00%)" — dominant formation + share of match minutes
  awayScheme: string | null;
  timeSegments: TimeSegmentsResult | null; // Match Dynamics page: 8 metrics x Total/1st/2nd half + 6 per-15-min buckets, per side
  passCombinationsHome: TeamPassSummary | null; // Passes page: per-player pass-combination grid + team's def/mid/final-third split
  passCombinationsAway: TeamPassSummary | null;
  // Cover page's goalscorer list + lineup page's cards/substitutions, merged and minute-sorted per side.
  matchEvents: { home: MatchEvent[]; away: MatchEvent[] };
  // The 11 starting players per side (jersey, formation slot, name) — for the pitch/formation view.
  startingLineups: { home: StartingPlayer[]; away: StartingPlayer[] };
  // Every player's average on-pitch position (jersey + x/y %), from the POSITIONS page's own diagram — includes subs, not just the starting 11.
  averagePositions: { home: AveragePosition[]; away: AveragePosition[] };
  shots: { home: ShotEvent[]; away: ShotEvent[] };
  losses: { home: ScatterEvent[]; away: ScatterEvent[] };
  recoveries: { home: ScatterEvent[]; away: ScatterEvent[] };
  keyPasses: { home: ScatterEvent[]; away: ScatterEvent[] };
  crosses: { home: ScatterEvent[]; away: ScatterEvent[] };
  // Real per-phase formation-slot positions from the POSITIONS page's own diagrams — "starting" = earliest phase, "final" = whatever was on the pitch at the final whistle.
  startingFormationLineup: { home: FormationSlot[]; away: FormationSlot[] };
  finalFormationLineup: { home: FormationSlot[]; away: FormationSlot[] };
}

function parseMetadata(items: TextItem[], pageWidth: number): MatchReportMeta {
  const joined = items.map((it) => it.str).join(" ");
  const scoreMatch = joined.match(/(\d+)\s*[–-]\s*(\d+)/);

  const rows = groupRows(items);
  // Locate the row containing the score (e.g. "1 – 1", grouped into one phrase
  // by pdfjs unlike pdfplumber's per-word output): team names are the row right below it.
  const scoreRowIdx = rows.findIndex((r) => r.some((it) => /^\d+\s*[–-]\s*\d+$/.test(it.str)));

  let homeTeam: string | null = null;
  let awayTeam: string | null = null;
  const nameRow = scoreRowIdx >= 0 ? rows[scoreRowIdx + 1] : undefined;
  if (nameRow) {
    const mid = pageWidth / 2;
    const left = nameRow.filter((it) => it.x < mid).map((it) => it.str).join(" ");
    const right = nameRow.filter((it) => it.x >= mid).map((it) => it.str).join(" ");
    homeTeam = left || null;
    awayTeam = right || null;
  }

  const dateLine = items.find((it) => /^\d{2}\/\d{2}\/\d{4}/.test(it.str))?.str;
  const dateRow = dateLine ? rows.find((r) => r.some((it) => it.str === dateLine)) : undefined;
  const dateRowText = dateRow ? dateRow.map((it) => it.str).join(" ") : "";
  const dateMatch = dateRowText.match(/(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(Round\s*\d+)/);

  const matchDate = dateMatch ? dateMatch[1] : null;
  let matchDateIso: string | null = null;
  if (matchDate) {
    const [d, m, y] = matchDate.split("/");
    matchDateIso = `${y}-${m}-${d}`;
  }

  return {
    homeTeam,
    awayTeam,
    homeScore: scoreMatch ? Number(scoreMatch[1]) : null,
    awayScore: scoreMatch ? Number(scoreMatch[2]) : null,
    matchDate,
    matchDateIso,
    competition: dateMatch ? dateMatch[2] : null,
    round: dateMatch ? dateMatch[3] : null,
    durationMinutes: null, // filled in later from the POSITIONS page
  };
}

const GOAL_SCORER_RE = /^(\d+(?:\+\d+)?)'\s*(.+)$/;

function minuteSortValue(minute: string): number {
  const m = minute.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
}

/**
 * Reads the cover page's goalscorer lists — printed as one text item per
 * entry, e.g. "71' Mendonça", stacked below each team's name (home column on
 * the left half of the page, away on the right — same x < mid split as
 * parseMetadata's team names). This list actually mixes in red-card
 * dismissals using the identical "{minute}' {name}" format (confirmed against
 * a real export where the listed "scorer" didn't match the printed score at
 * all — it was a straight red, not a goal), so each entry's icon color is
 * checked against the same fills used for card/substitution classification
 * on the lineup page; only gray (ball-icon) entries are kept as goals.
 *
 * The two columns mirror each other: the icon sits near the *start* of the
 * home column's text but near the *end* of the away column's text (each
 * icon faces outward toward its own edge of the page) — confirmed against a
 * real export where a long away name ("15' N. Haljeta") put the icon ~73px
 * past the text's start x, missing entirely under a start-only check.
 */
function parseGoalScorers(items: TextItem[], pageWidth: number, fills: IconFill[]): (MatchEvent & { side: "home" | "away" })[] {
  const mid = pageWidth / 2;
  const entries: (MatchEvent & { side: "home" | "away" })[] = [];
  for (const it of items) {
    const m = it.str.match(GOAL_SCORER_RE);
    if (!m) continue;
    const side: "home" | "away" = it.x < mid ? "home" : "away";
    const anchorX = side === "home" ? it.x : it.x + (it.width ?? 0);
    if (classifyMarkerIcon(anchorX, it.y, fills, 20) !== "goal") continue; // excludes red-card entries
    entries.push({ type: "goal", minute: m[1], player: m[2].trim(), side });
  }
  return entries;
}

function findTeamStatsPageIndex(pagesText: string[]): number {
  return pagesText.findIndex((t) => t.replace(/\s+/g, "").toUpperCase().includes("TEAMSTATS"));
}

function findPositionsPageIndex(pagesText: string[]): number {
  return pagesText.findIndex((t) => t.replace(/\s+/g, "").toUpperCase().includes("POSITIONS"));
}

function findLineupPageIndex(pagesText: string[]): number {
  return pagesText.findIndex((t) => t.replace(/\s+/g, "").toUpperCase().includes("STARTINGLINEUP"));
}

function findMatchDynamicsPageIndex(pagesText: string[]): number {
  return pagesText.findIndex((t) => t.replace(/\s+/g, "").toUpperCase().includes("MATCHDYNAMICS"));
}

/**
 * Finds both "Passes" pages (one per team). Matching on the bare word
 * "PASSES" would also hit the Team Stats page ("Total passes / accurate"
 * etc.), so this matches the page's unique caption instead.
 */
function findPassesPageIndices(pagesText: string[]): number[] {
  const needle = "SHOWSONLYCOMBINATIONSWITHMORETHAN";
  return pagesText.reduce<number[]>((acc, t, i) => {
    if (t.replace(/\s+/g, "").toUpperCase().includes(needle)) acc.push(i);
    return acc;
  }, []);
}

/** Finds both "Shots" pages (one per team) via their unique table columns — "Shots / on target" elsewhere in the report never has both. */
function findShotsPageIndices(pagesText: string[]): number[] {
  return pagesText.reduce<number[]>((acc, raw, i) => {
    const t = raw.replace(/\s+/g, "").toUpperCase();
    if (t.includes("SHOTTYPE") && t.includes("PSXG")) acc.push(i);
    return acc;
  }, []);
}

function findByNeedle(pagesText: string[], test: (stripped: string) => boolean): number {
  return pagesText.findIndex((t) => test(t.replace(/\s+/g, "").toUpperCase()));
}

// "LOSSES"/"RECOVERIES" alone also appear in Team/Player Stats column headers
// ("Losses / low / medium / high", "Recoveries / opponent half"); each
// location page's own "<Kind> type" breakdown caption is unique to it.
const findLossesPageIndex = (pagesText: string[]) => findByNeedle(pagesText, (t) => t.includes("LOSSESTYPE"));
const findRecoveriesPageIndex = (pagesText: string[]) => findByNeedle(pagesText, (t) => t.includes("RECOVERIESTYPE"));
// "Key passes" is also a Player Stats column header; only the location page pairs it with a 1st/2nd-half split.
const findKeyPassesPageIndex = (pagesText: string[]) => findByNeedle(pagesText, (t) => t.includes("KEYPASSES") && t.includes("1STHALF"));
// The goalkeeper page's "Crosses against ... CROSSES MAP" widget also matches "CROSSES" + "1STHALF"; exclude it by its own unique caption.
const findCrossesPageIndex = (pagesText: string[]) => findByNeedle(pagesText, (t) => t.includes("CROSSES") && t.includes("1STHALF") && !t.includes("CROSSESMAP"));

/**
 * Reads the Starting Lineup page's phase markers — "1'", "45+X'" (end of 1st
 * half), "46'", "90+Y'" (end of 2nd half) — and returns 90 + X + Y. Verified
 * exact against two hand-entered legacy rows (95 and 101 minutes); using the
 * POSITIONS page's own segment end-times instead undercounts by several
 * minutes, so this is the one to trust.
 */
function parseMatchDuration(items: TextItem[]): { totalMinutes: number | null; firstHalfAdded: number; secondHalfAdded: number } {
  const firstHalf = items.find((it) => /^45(?:\+(\d+))?'$/.test(it.str));
  const secondHalf = items.find((it) => /^90(?:\+(\d+))?'$/.test(it.str));
  if (!secondHalf) return { totalMinutes: null, firstHalfAdded: 0, secondHalfAdded: 0 };
  const firstAdded = firstHalf ? Number(firstHalf.str.match(/^45(?:\+(\d+))?'$/)![1] ?? 0) : 0;
  const secondAdded = Number(secondHalf.str.match(/^90(?:\+(\d+))?'$/)![1] ?? 0);
  return { totalMinutes: 90 + firstAdded + secondAdded, firstHalfAdded: firstAdded, secondHalfAdded: secondAdded };
}

const FORMATION_CODE_RE = /^\d(?:-\d)+$/;
const MINUTE_RANGE_RE = /^(\d+)(?:\+(\d+))?['’]?\s*[—-]\s*(\d+)(?:\+(\d+))?['’]?$/;

function minuteValue(numPart: string, addedPart: string | undefined): number {
  return Number(numPart) + (addedPart ? Number(addedPart) : 0);
}

/**
 * Reads the "POSITIONS" page's formation timeline (e.g. "4-2-3-1" paired with
 * "1' — 67'"), per team (x < mid = home/left, x >= mid = away/right — same
 * column-split trick as the metadata and Team Stats parsing). A team can
 * switch formation mid-match, so this sums minutes-per-formation (treating
 * each side's first segment as starting at kickoff, minute 0, since the
 * printed "1'" undercounts by construction) and reports the dominant one as
 * a share of the true match duration (from parseMatchDuration) — still an
 * approximation of a hand-entered legacy value, off by ~1pp in testing.
 */
function parseFormations(items: TextItem[], pageWidth: number, matchDuration: number | null): { homeScheme: string | null; awayScheme: string | null } {
  const mid = pageWidth / 2;
  const relevant = items.filter((it) => FORMATION_CODE_RE.test(it.str) || MINUTE_RANGE_RE.test(it.str));
  const rows = groupRows(relevant);

  const segmentsBySide: { formation: string; start: number; end: number }[][] = [[], []];

  for (const row of rows) {
    for (let i = 0; i < row.length - 1; i++) {
      const codeItem = row[i];
      const rangeItem = row[i + 1];
      if (!FORMATION_CODE_RE.test(codeItem.str) || !MINUTE_RANGE_RE.test(rangeItem.str)) continue;
      const m = rangeItem.str.match(MINUTE_RANGE_RE)!;
      const start = minuteValue(m[1], m[2]);
      const end = minuteValue(m[3], m[4]);
      const side = codeItem.x < mid ? 0 : 1;
      segmentsBySide[side].push({ formation: codeItem.str, start, end });
      i++; // consumed the range item too
    }
  }

  function dominantScheme(segments: { formation: string; start: number; end: number }[]): string | null {
    if (segments.length === 0 || !matchDuration) return null;
    segments.sort((a, b) => a.start - b.start);
    const minutesByFormation: Record<string, number> = {};
    segments.forEach((seg, idx) => {
      const start = idx === 0 ? 0 : seg.start; // first segment counted from kickoff, not its printed "1'"
      minutesByFormation[seg.formation] = (minutesByFormation[seg.formation] ?? 0) + Math.max(0, seg.end - start);
    });
    const entries = Object.entries(minutesByFormation).sort((a, b) => b[1] - a[1]);
    const [formation, mins] = entries[0];
    // Segments can overlap when a side logs several same-formation phases
    // (e.g. around a sub), which would otherwise push this over 100%.
    const pct = Math.min(100, (mins / matchDuration) * 100);
    return `${formation} (${pct.toFixed(2)}%)`;
  }

  return {
    homeScheme: dominantScheme(segmentsBySide[0]),
    awayScheme: dominantScheme(segmentsBySide[1]),
  };
}

/** One "half of the page" (left labels or right labels) -> { label: [homeValue, awayValue] }. */
function parseStatsColumn(items: TextItem[]): Record<string, [string, string]> {
  const rows = groupRows(items);
  const result: Record<string, [string, string]> = {};
  for (const row of rows) {
    const rowText = row.map((it) => it.str).join(" ");
    const label = TEAM_STATS_LABELS.find((l) => rowText.startsWith(l));
    if (!label) continue;
    const rest = rowText.slice(label.length).trim();
    const tokens = rest.split(/\s+/).filter(Boolean);
    const half = Math.floor(tokens.length / 2);
    result[label] = [tokens.slice(0, half).join(" "), tokens.slice(half).join(" ")];
  }
  return result;
}

function toStatsJson(teamStats: Record<string, [string, string]>, side: 0 | 1): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, pair] of Object.entries(teamStats)) {
    out[slug(label)] = pair[side];
  }
  return out;
}

export async function parseMatchReportPdf(fileBytes: Uint8Array): Promise<ExtractedMatchReport> {
  // pdfjs detaches/transfers its `data` buffer once consumed, so keep an
  // untouched copy for pdf-lib (used later, for chart color resolution).
  const pdfBytesForColors = fileBytes.slice();

  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data: fileBytes, useSystemFonts: true }).promise;

  const page1 = await doc.getPage(1);
  const page1Items = await getPageItems(page1);
  const page1Width = page1.getViewport({ scale: 1 }).width;
  const meta = parseMetadata(page1Items, page1Width);
  const page1Fills = await extractIconFills(pdfjsLib, page1);
  const goalEntries = parseGoalScorers(page1Items, page1Width, page1Fills);

  const pagesText: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const items = await getPageItems(p);
    pagesText.push(items.map((it) => it.str).join(" "));
  }
  const statsPageNum = findTeamStatsPageIndex(pagesText) + 1; // 1-indexed page number, 0 if not found

  let teamStatsHome: Record<string, string> = {};
  let teamStatsAway: Record<string, string> = {};
  if (statsPageNum > 0) {
    const statsPage = await doc.getPage(statsPageNum);
    const items = await getPageItems(statsPage);
    const midX = statsPage.getViewport({ scale: 1 }).width / 2;
    const left = parseStatsColumn(items.filter((it) => it.x < midX));
    const right = parseStatsColumn(items.filter((it) => it.x >= midX));
    const combined = { ...left, ...right };
    teamStatsHome = toStatsJson(combined, 0);
    teamStatsAway = toStatsJson(combined, 1);
  }

  const lineupPageNum = findLineupPageIndex(pagesText) + 1;
  let firstHalfAdded = 0;
  let secondHalfAdded = 0;
  let lineupEvents: { home: MatchEvent[]; away: MatchEvent[] } = { home: [], away: [] };
  let startingLineups: { home: StartingPlayer[]; away: StartingPlayer[] } = { home: [], away: [] };
  if (lineupPageNum > 0) {
    const lineupPage = await doc.getPage(lineupPageNum);
    const items = await getPageItems(lineupPage);
    const duration = parseMatchDuration(items);
    meta.durationMinutes = duration.totalMinutes;
    firstHalfAdded = duration.firstHalfAdded;
    secondHalfAdded = duration.secondHalfAdded;

    const lineupWidth = lineupPage.getViewport({ scale: 1 }).width;
    const lineupFills = await extractIconFills(pdfjsLib, lineupPage);
    lineupEvents = parseMatchEvents(items, lineupWidth, lineupFills);
    startingLineups = parseStartingLineups(items, lineupWidth);
  }

  const positionsPageNum = findPositionsPageIndex(pagesText) + 1;
  let homeScheme: string | null = null;
  let awayScheme: string | null = null;
  let averagePositions: { home: AveragePosition[]; away: AveragePosition[] } = { home: [], away: [] };
  let startingFormationLineup: { home: FormationSlot[]; away: FormationSlot[] } = { home: [], away: [] };
  let finalFormationLineup: { home: FormationSlot[]; away: FormationSlot[] } = { home: [], away: [] };
  if (positionsPageNum > 0) {
    const positionsPage = await doc.getPage(positionsPageNum);
    const items = await getPageItems(positionsPage);
    const positionsWidth = positionsPage.getViewport({ scale: 1 }).width;
    const formations = parseFormations(items, positionsWidth, meta.durationMinutes);
    homeScheme = formations.homeScheme;
    awayScheme = formations.awayScheme;
    averagePositions = parseAveragePositions(items);
    const positionsPathBoxes = await extractPathBoxes(pdfjsLib, positionsPage);
    const formationLineups = parseFormationLineups(items, positionsPathBoxes, positionsWidth);
    startingFormationLineup = formationLineups.starting;
    finalFormationLineup = formationLineups.final;
  }

  let timeSegments: TimeSegmentsResult | null = null;
  const dynamicsPageNum = findMatchDynamicsPageIndex(pagesText) + 1;
  if (dynamicsPageNum > 0 && meta.homeTeam && meta.awayTeam) {
    const dynamicsPage = await doc.getPage(dynamicsPageNum);
    const items = await getPageItems(dynamicsPage);
    const width = dynamicsPage.getViewport({ scale: 1 }).width;
    const colorFills = await extractPatternFills(pdfjsLib, dynamicsPage, pdfBytesForColors, dynamicsPageNum - 1);
    timeSegments = parseTimeSegments(items, width, meta.homeTeam, meta.awayTeam, firstHalfAdded, secondHalfAdded, colorFills);
  }

  let passCombinationsHome: TeamPassSummary | null = null;
  let passCombinationsAway: TeamPassSummary | null = null;
  const passesPageNums = findPassesPageIndices(pagesText).map((i) => i + 1);
  if (passesPageNums.length > 0 && meta.homeTeam && meta.awayTeam) {
    for (const pageNum of passesPageNums) {
      const passesPage = await doc.getPage(pageNum);
      const items = await getPageItems(passesPage);
      const isHome = items.some((it) => it.str === meta.homeTeam);
      const isAway = items.some((it) => it.str === meta.awayTeam);
      if (isHome) passCombinationsHome = parsePassCombinationPage(items);
      else if (isAway) passCombinationsAway = parsePassCombinationPage(items);
    }
  }

  const matchEvents = {
    home: [...goalEntries.filter((e) => e.side === "home"), ...lineupEvents.home].sort((a, b) => minuteSortValue(a.minute) - minuteSortValue(b.minute)),
    away: [...goalEntries.filter((e) => e.side === "away"), ...lineupEvents.away].sort((a, b) => minuteSortValue(a.minute) - minuteSortValue(b.minute)),
  };

  let shots: { home: ShotEvent[]; away: ShotEvent[] } = { home: [], away: [] };
  const shotsPageNums = findShotsPageIndices(pagesText).map((i) => i + 1);
  if (shotsPageNums.length > 0 && meta.homeTeam && meta.awayTeam) {
    for (const pageNum of shotsPageNums) {
      const shotsPage = await doc.getPage(pageNum);
      const items = await getPageItems(shotsPage);
      const isHome = items.some((it) => it.str === meta.homeTeam);
      const isAway = items.some((it) => it.str === meta.awayTeam);
      const fills = await extractIconFills(pdfjsLib, shotsPage);
      const side: "home" | "away" | null = isHome ? "home" : isAway ? "away" : null;
      if (!side) continue;
      const parsed = parseShots(items, fills).map((s) => {
        const isGoal = matchEvents[side].some((e) => e.type === "goal" && e.minute === s.minute);
        return isGoal ? { ...s, outcome: "goal" as const } : s;
      });
      shots[side] = parsed;
    }
  }

  async function parseScatterPage(pageNum: number, detectLeadsToShot: boolean): Promise<{ home: ScatterEvent[]; away: ScatterEvent[] }> {
    const page = await doc.getPage(pageNum);
    const items = await getPageItems(page);
    const width = page.getViewport({ scale: 1 }).width;
    const pathBoxes = await extractPathBoxes(pdfjsLib, page);
    const eventBoxes = findEventDiagramBoxes(pathBoxes, width);
    if (!eventBoxes) return { home: [], away: [] };
    const fills = detectLeadsToShot ? await extractIconFills(pdfjsLib, page) : [];
    return parseEventScatterPage(items, eventBoxes, fills, detectLeadsToShot);
  }

  let losses: { home: ScatterEvent[]; away: ScatterEvent[] } = { home: [], away: [] };
  const lossesPageNum = findLossesPageIndex(pagesText) + 1;
  if (lossesPageNum > 0) losses = await parseScatterPage(lossesPageNum, true);

  let recoveries: { home: ScatterEvent[]; away: ScatterEvent[] } = { home: [], away: [] };
  const recoveriesPageNum = findRecoveriesPageIndex(pagesText) + 1;
  if (recoveriesPageNum > 0) recoveries = await parseScatterPage(recoveriesPageNum, false);

  let keyPasses: { home: ScatterEvent[]; away: ScatterEvent[] } = { home: [], away: [] };
  const keyPassesPageNum = findKeyPassesPageIndex(pagesText) + 1;
  if (keyPassesPageNum > 0) keyPasses = await parseScatterPage(keyPassesPageNum, false);

  let crosses: { home: ScatterEvent[]; away: ScatterEvent[] } = { home: [], away: [] };
  const crossesPageNum = findCrossesPageIndex(pagesText) + 1;
  if (crossesPageNum > 0) crosses = await parseScatterPage(crossesPageNum, false);

  return {
    meta,
    teamStatsHome,
    teamStatsAway,
    homeScheme,
    awayScheme,
    timeSegments,
    passCombinationsHome,
    passCombinationsAway,
    matchEvents,
    startingLineups,
    averagePositions,
    shots,
    losses,
    recoveries,
    keyPasses,
    crosses,
    startingFormationLineup,
    finalFormationLineup,
  };
}
