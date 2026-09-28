// lib/physicalStats/parseCatapultReport.ts
// Parses the "TEAM SUMMARY" table (page 1) of a Catapult OpenField Athlete
// Report PDF — one row per player for the whole session. Per-drill breakdown
// tables (11v11, 7v7, Passing Drill, ...) on later pages are out of scope for
// now (player_physical_stats.drill stays NULL for these rows).
import { loadPdfjs, getPageItems, groupRows, type TextItem } from "../pdf/textLayout";

export interface CatapultSessionMeta {
  clubName: string | null;
  sessionDate: string | null; // dd/mm/yyyy, as printed
  sessionDateIso: string | null; // yyyy-mm-dd
  sessionType: string; // lowercase, defaults to "training"
}

export interface CatapultPlayerRow {
  playerNameRaw: string;
  durationSeconds: number | null;
  totalDistanceM: number | null;
  distPerMin: number | null;
  maxVelocityKmh: number | null;
  hsDistanceM: number | null;
  sprintDistanceM: number | null;
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

/** Parses one player row's tokens, anchored from the right since the last 10 fields are always numeric/imbalance. */
function parsePlayerRow(tokens: string[]): CatapultPlayerRow | null {
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
    durationSeconds: parseDurationSeconds(durationTok),
    totalDistanceM: num(totalDistTok),
    distPerMin: num(distPerMinTok),
    maxVelocityKmh: num(maxVelTok),
    hsDistanceM: num(hsTok),
    sprintDistanceM: num(sprintTok),
    accelerations: num(accelTok),
    decelerations: num(decelTok),
    totalJumps: num(jumpsTok),
    runningImbalancePct: imbalanceMatch ? Number(imbalanceMatch[1]) : null,
    runningImbalanceSide: imbalanceMatch ? imbalanceMatch[2] : null,
  };
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
      const player = parsePlayerRow(tokens);
      if (player) players.push(player);
    }
  }

  return {
    meta: { clubName, sessionDate, sessionDateIso, sessionType },
    players,
  };
}
