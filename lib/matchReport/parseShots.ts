// lib/matchReport/parseShots.ts
// Parses the two "SHOTS" pages (one per team): a half-pitch diagram with one
// numbered dot per shot, next to a table (#, Player, Time, Shot type, xG,
// PsxG) — the dot's number is that row's "#", not a jersey number. Confirmed
// against all 3 sample exports: the diagram's outer box is byte-identical
// (14.4,278.3)-(280.8,489.0) on every Shots page in every file, same
// fixed-template pattern as the POSITIONS page.
//
// The table's column x-positions are NOT fixed across pages — confirmed
// against a real export where the away team's page had every column ~20pt
// further right than the home team's page on the same file (presumably the
// Player-name column reflows to fit its own content), which made a
// fixed-x-range parse silently return zero rows for that page. So this
// parses each row structurally instead, by token type in x-order: the first
// two purely-numeric tokens are the shot's own "#" and the player's jersey
// number (no separate header for jersey — it's not identifiable by position
// alone), everything up to the first "<minute>'" token is the player name,
// then shot type, then xG, then PsxG.
//
// Outcome (on target / blocked / wide) isn't printed as text anywhere, but
// is recoverable from data already on the page: PsxG is only ever computed
// for shots that were on target (present -> on target, "-" -> not), and
// blocked shots get a small dark accent (#000000/#333333 — the same
// ball-icon colors resolveIconColors.ts already uses for "goal" elsewhere in
// this report) drawn on their dot, which wide shots don't have. Verified
// against a real export where this exactly reproduced the page's own printed
// totals ("On goal 3", "Blocked 3", "Wide 9" out of 15). "Goal" itself is
// resolved by the caller, which cross-references (side, minute) against the
// already-parsed goal events.
import { groupRows, dedupeNearby, type TextItem } from "../pdf/textLayout";
import { classifyMarkerIcon, type IconFill } from "./resolveIconColors";

export interface ShotEvent {
  index: number; // the dot's own "#" — not a jersey number
  jersey: number;
  player: string; // best-effort — a handful of rows double-paint their name text in a way that can't be cleanly reconstructed; the jersey number is the reliable identity anchor
  minute: string;
  shotType: string;
  xg: number | null;
  psxg: number | null;
  outcome: "goal" | "on_target" | "blocked" | "wide"; // "goal" is set by the caller, which cross-references matchEvents
  xPct: number; // 0-100, box-relative horizontal (pitch width axis)
  yPct: number; // 0-100, box-relative vertical (halfway line = 0, goal line = 100 — length axis)
}

const SHOT_BOX = { x1: 14.4, y1: 278.3, x2: 280.8, y2: 489.0 };
const LABEL_RE = /^\d{1,2}$/;
const NUM_RE = /^\d{1,3}$/;
const TIME_RE = /^\d+(?:\+\d+)?'$/;
const DECIMAL_RE = /^<?\d*\.?\d+$/;

function toPct(x: number, y: number): { xPct: number; yPct: number } {
  const xPct = ((x - SHOT_BOX.x1) / (SHOT_BOX.x2 - SHOT_BOX.x1)) * 100;
  const yPct = ((y - SHOT_BOX.y1) / (SHOT_BOX.y2 - SHOT_BOX.y1)) * 100;
  return { xPct: Math.max(0, Math.min(100, xPct)), yPct: Math.max(0, Math.min(100, yPct)) };
}

function parseXg(str: string | undefined): number | null {
  if (!str || str === "-") return null;
  const n = Number(str.replace("<", ""));
  return Number.isFinite(n) ? n : null;
}

type ParsedRow = Omit<ShotEvent, "xPct" | "yPct" | "outcome">;

function parseRow(row: TextItem[]): ParsedRow | null {
  const deduped = dedupeNearby(row, 1.5);
  if (deduped.length < 2 || !NUM_RE.test(deduped[0].str) || !NUM_RE.test(deduped[1].str)) return null;
  const index = Number(deduped[0].str);
  const jersey = Number(deduped[1].str);

  const rest = deduped.slice(2);
  const timeIdx = rest.findIndex((it) => TIME_RE.test(it.str));
  if (timeIdx < 1) return null; // need at least one name token before the minute
  const player = rest.slice(0, timeIdx).map((it) => it.str).join(" ");
  const minute = rest[timeIdx].str.replace(/'$/, "");

  const afterTime = rest.slice(timeIdx + 1);
  const xgIdx = afterTime.findIndex((it) => DECIMAL_RE.test(it.str));
  if (xgIdx < 1) return null; // need at least one shot-type token before xG
  const shotType = afterTime.slice(0, xgIdx).map((it) => it.str).join(" ");
  const xg = parseXg(afterTime[xgIdx].str);
  const psxg = parseXg(afterTime[xgIdx + 1]?.str);

  return { index, jersey, player, minute, shotType, xg, psxg };
}

export function parseShots(items: TextItem[], fills: IconFill[]): ShotEvent[] {
  const tableRows = groupRows(items.filter((it) => it.x >= 300));
  const rowsByIndex = new Map<number, ParsedRow>();
  for (const row of tableRows) {
    const parsed = parseRow(row);
    if (!parsed || rowsByIndex.has(parsed.index)) continue;
    rowsByIndex.set(parsed.index, parsed);
  }

  // Pitch-diagram labels: bare 1-2 digit numbers inside the shot-map box (distinct from the jersey/# columns, which sit at x >= 300).
  const labels = items.filter((it) => LABEL_RE.test(it.str) && it.x >= SHOT_BOX.x1 && it.x <= SHOT_BOX.x2 && it.y >= SHOT_BOX.y1 && it.y <= SHOT_BOX.y2);

  const shots: ShotEvent[] = [];
  for (const label of labels) {
    const row = rowsByIndex.get(Number(label.str));
    if (!row) continue;
    const hasDarkAccent = classifyMarkerIcon(label.x, label.y, fills, 6) === "goal"; // reuses the goal-ball-icon color check as a generic "dark accent present" test
    const outcome: ShotEvent["outcome"] = row.psxg !== null ? "on_target" : hasDarkAccent ? "blocked" : "wide";
    const { xPct, yPct } = toPct(label.x, label.y);
    shots.push({ ...row, outcome, xPct, yPct });
  }
  return shots.sort((a, b) => a.index - b.index);
}
