// lib/physicalStats/parseCatapultReport.ts
// Parses a Catapult OpenField Athlete Report PDF: the "TEAM SUMMARY" table
// (page 1, one row per player for the whole session) plus, for training
// sessions, every per-drill/period breakdown table on the following pages
// (e.g. "1st GAME", "Period 6", "WARM UP", "HSR" — whatever Catapult split
// the session into). Each drill table uses the same columns as Team Summary
// plus one extra ("Tot PL" / player load, inserted right after Tot Dist),
// so it gets its own row parser. Drill sections are demarcated by a
// standalone text row naming the drill; `drill: null` marks the Team
// Summary (whole-session) row for a player.
import { loadPdfjs, getPageItems, groupRows, type TextItem } from "../pdf/textLayout";

export interface CatapultSessionMeta {
  clubName: string | null;
  sessionDate: string | null; // dd/mm/yyyy, as printed
  sessionDateIso: string | null; // yyyy-mm-dd
  sessionType: string; // lowercase, defaults to "training"
}

export interface CatapultPlayerRow {
  playerNameRaw: string;
  drill: string | null; // null = Team Summary (whole session); else e.g. "1st GAME", "Period 6", "WARM UP", "HSR"
  durationSeconds: number | null;
  totalDistanceM: number | null;
  distPerMin: number | null;
  maxVelocityKmh: number | null;
  hsDistanceM: number | null;
  sprintDistanceM: number | null;
  playerLoad: number | null; // only present in per-drill tables, null for Team Summary
  accelerations: number | null;
  decelerations: number | null;
  totalJumps: number | null;
  runningImbalancePct: number | null;
  runningImbalanceSide: string | null;
}

export interface ExtractedCatapultReport {
  meta: CatapultSessionMeta;
  players: CatapultPlayerRow[];
}

const SESSION_TYPES = ["training", "match", "game", "friendly"];

function parseDurationSeconds(hhmmss: string): number | null {
  const m = hhmmss.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSessionDate(items: TextItem[]): { printed: string | null; iso: string | null } {
  const dateItem = items.find((it) => /^\d{2}\/\d{2}\/\d{4}$/.test(it.str));
  if (!dateItem) return { printed: null, iso: null };
  const [d, m, y] = dateItem.str.split("/");
  return { printed: dateItem.str, iso: `${y}-${m}-${d}` };
}

function parseSessionType(items: TextItem[]): string {
  const found = items.find((it) => SESSION_TYPES.includes(it.str.toLowerCase()));
  return found ? found.str.toLowerCase() : "training";
}

/** Parses one Team Summary row's tokens, anchored from the right since the last 10 fields are always numeric/imbalance. */
function parseTeamSummaryRow(tokens: string[]): CatapultPlayerRow | null {
  if (tokens.length < 11) return null;
  const imbalanceTok = tokens[tokens.length - 1];
  const jumpsTok = tokens[tokens.length - 2];
  const decelTok = tokens[tokens.length - 3];
  const accelTok = tokens[tokens.length - 4];
  const sprintTok = tokens[tokens.length - 5];
  const hsTok = tokens[tokens.length - 6];
  const maxVelTok = tokens[tokens.length - 7];
  const distPerMinTok = tokens[tokens.length - 8];
  const totalDistTok = tokens[tokens.length - 9];
  const durationTok = tokens[tokens.length - 10];
  const nameTok = tokens.slice(0, tokens.length - 10).join(" ");

  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(durationTok)) return null;

  const imbalanceMatch = imbalanceTok.match(/^([\d.]+)%\s*(Left|Right)$/i);

  return {
    playerNameRaw: nameTok,
    drill: null,
    durationSeconds: parseDurationSeconds(durationTok),
    totalDistanceM: num(totalDistTok),
    distPerMin: num(distPerMinTok),
    maxVelocityKmh: num(maxVelTok),
    hsDistanceM: num(hsTok),
    sprintDistanceM: num(sprintTok),
    playerLoad: null,
    accelerations: num(accelTok),
    decelerations: num(decelTok),
    totalJumps: num(jumpsTok),
    runningImbalancePct: imbalanceMatch ? Number(imbalanceMatch[1]) : null,
    runningImbalanceSide: imbalanceMatch ? imbalanceMatch[2] : null,
  };
}

/**
 * Parses one per-drill breakdown row (pages after Team Summary). Same shape
 * as a Team Summary row but with one extra field — Tot PL (player load),
 * inserted right after Tot Dist — so it anchors from 11 trailing fields
 * instead of 10.
 */
function parsePeriodRow(tokens: string[], drill: string | null): CatapultPlayerRow | null {
  if (tokens.length < 12) return null;
  const imbalanceTok = tokens[tokens.length - 1];
  const jumpsTok = tokens[tokens.length - 2];
  const decelTok = tokens[tokens.length - 3];
  const accelTok = tokens[tokens.length - 4];
  const sprintTok = tokens[tokens.length - 5];
  const hsTok = tokens[tokens.length - 6];
  const maxVelTok = tokens[tokens.length - 7];
  const distPerMinTok = tokens[tokens.length - 8];
  const playerLoadTok = tokens[tokens.length - 9];
  const totalDistTok = tokens[tokens.length - 10];
  const durationTok = tokens[tokens.length - 11];
  const nameTok = tokens.slice(0, tokens.length - 11).join(" ");

  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(durationTok)) return null;

  const imbalanceMatch = imbalanceTok.match(/^([\d.]+)%\s*(Left|Right)$/i);

  return {
    playerNameRaw: nameTok,
    drill,
    durationSeconds: parseDurationSeconds(durationTok),
    totalDistanceM: num(totalDistTok),
    distPerMin: num(distPerMinTok),
    maxVelocityKmh: num(maxVelTok),
    hsDistanceM: num(hsTok),
    sprintDistanceM: num(sprintTok),
    playerLoad: num(playerLoadTok),
    accelerations: num(accelTok),
    decelerations: num(decelTok),
    totalJumps: num(jumpsTok),
    runningImbalancePct: imbalanceMatch ? Number(imbalanceMatch[1]) : null,
    runningImbalanceSide: imbalanceMatch ? imbalanceMatch[2] : null,
  };
}

/**
 * A standalone single-token row on a drill-breakdown page is either a new
 * drill section's name ("1st GAME", "Period 6", "WARM UP", "HSR", ...) or a
 * stray fragment of the recurring column header/page footer (the "Running
 * Imbalance" header wraps its last syllable, "e", onto its own line). Real
 * drill names are never that short, so a length cutoff tells them apart
 * without having to enumerate every possible drill name Catapult might print.
 */
function isPageChrome(token: string): boolean {
  if (token.length <= 2) return true; // e.g. stray "e" from a wrapped header
  if (/^PAGE \d+ OF \d+$/i.test(token)) return true;
  if (token.toUpperCase() === "OPENFIELD ATHLETE REPORT") return true;
  if (token.toLowerCase().startsWith("powered by")) return true;
  return false;
}

export async function parseCatapultReportPdf(fileBytes: Uint8Array): Promise<ExtractedCatapultReport> {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data: fileBytes, useSystemFonts: true }).promise;

  const page1 = await doc.getPage(1);
  const items = await getPageItems(page1);

  const { printed: sessionDate, iso: sessionDateIso } = parseSessionDate(items);
  const sessionType = parseSessionType(items);

  const titleItem = items.find((it) => it.str.toUpperCase() === "TEAM SUMMARY");
  const players: CatapultPlayerRow[] = [];
  let clubName: string | null = null;

  if (titleItem) {
    const tableItems = items.filter((it) => it.y < titleItem.y);
    const rows = groupRows(tableItems);
    for (const row of rows) {
      const tokens = row.map((it) => it.str);
      if (tokens.length === 1) {
        // A lone row above the player list is the club/team name heading.
        if (/^average$/i.test(tokens[0])) break;
        clubName = tokens[0];
        continue;
      }
      if (/^average$/i.test(tokens[0])) break;
      const player = parseTeamSummaryRow(tokens);
      if (player) players.push(player);
    }
  }

  // Per-drill/period breakdown tables, pages after Team Summary — only
  // present for some reports (e.g. training sessions split into games/
  // periods/warm-up/HSR; a straight matchday report may not have them). A
  // drill's table can run past a page break without its name repeating, so
  // currentDrill carries over across pages rather than resetting per page.
  let currentDrill: string | null = null;
  for (let pageNum = 2; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const pageItems = await getPageItems(page);
    const rows = groupRows(pageItems);
    for (const row of rows) {
      const tokens = row.map((it) => it.str);
      const player = parsePeriodRow(tokens, currentDrill);
      if (player) {
        players.push(player);
        continue;
      }
      if (tokens.length === 1 && !isPageChrome(tokens[0])) {
        currentDrill = tokens[0];
      }
      // Any other row (recurring column header, page banner) isn't a drill
      // name or a player row — skip it.
    }
  }

  return {
    meta: { clubName, sessionDate, sessionDateIso, sessionType },
    players,
  };
}
