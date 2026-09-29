// lib/matchReport/parseFormationLineups.ts
// Parses the small formation-phase diagrams further down the POSITIONS page
// (below the average-positions pitch) — one mini portrait pitch per tactical
// phase a side played (e.g. "4-2-3-1" "1' — 67'", then another after a sub
// or reshuffle), each with all 11 players' actual slot position for that
// phase. Confirmed against a real export: the diagram's own outline box
// (from resolvePathBoxes) sits directly below its "<formation> <range>"
// header, ~118.7 wide x ~152.8 tall, portrait (goal-to-goal vertical, same
// convention as parseAveragePositions.ts) — but unlike that page's fixed
// box, a side can have 2 or 3 phases, and extra phases spill onto a second
// row further down the page, so boxes are matched to headers by proximity
// rather than a hardcoded count/position.
//
// This resolves exactly two lineups per side: "starting" (the phase with the
// earliest start minute) and "final" (the phase with the latest end minute —
// whatever was on the pitch at the final whistle, after every substitution
// and tactical reshuffle).
import { groupRows, type TextItem } from "../pdf/textLayout";
import type { PathBox } from "./resolvePathBoxes";

export interface FormationSlot {
  jersey: number;
  name: string;
  xPct: number; // 0-100, portrait width axis (touchline to touchline) — same swap-at-render convention as AveragePosition
  yPct: number; // 0-100, portrait length axis (own goal = 0, opponent goal = 100)
}

const FORMATION_CODE_RE = /^\d(?:-\d)+$/;
const MINUTE_RANGE_RE = /^(\d+)(?:\+(\d+))?['’]?\s*[—-]\s*(\d+)(?:\+(\d+))?['’]?$/;
const JERSEY_RE = /^\d{1,3}$/;

function minuteValue(numPart: string, addedPart: string | undefined): number {
  return Number(numPart) + (addedPart ? Number(addedPart) : 0);
}

interface Header {
  x: number;
  y: number;
  start: number;
  end: number;
  side: "home" | "away";
}

function findHeaders(items: TextItem[], pageWidth: number): Header[] {
  const mid = pageWidth / 2;
  const relevant = items.filter((it) => FORMATION_CODE_RE.test(it.str) || MINUTE_RANGE_RE.test(it.str));
  const rows = groupRows(relevant);
  const headers: Header[] = [];
  for (const row of rows) {
    for (let i = 0; i < row.length - 1; i++) {
      if (!FORMATION_CODE_RE.test(row[i].str) || !MINUTE_RANGE_RE.test(row[i + 1].str)) continue;
      const m = row[i + 1].str.match(MINUTE_RANGE_RE)!;
      headers.push({
        x: row[i].x,
        y: row[i].y,
        start: minuteValue(m[1], m[2]),
        end: minuteValue(m[3], m[4]),
        side: row[i].x < mid ? "home" : "away",
      });
      i++;
    }
  }
  return headers;
}

function diagramBoxFor(header: Header, boxes: PathBox[]): PathBox | null {
  let best: { box: PathBox; dist: number } | null = null;
  for (const b of boxes) {
    if (b.w < 80 || b.w > 160 || b.h < 100 || b.h > 200) continue; // plausible mini-formation-pitch footprint only
    const dist = Math.abs(b.x1 - header.x) + Math.abs(b.y2 - header.y);
    if (dist < 15 && (!best || dist < best.dist)) best = { box: b, dist };
  }
  return best?.box ?? null;
}

function slotsInBox(items: TextItem[], box: PathBox): FormationSlot[] {
  const jerseys = items.filter((it) => JERSEY_RE.test(it.str) && it.x >= box.x1 && it.x <= box.x2 && it.y >= box.y1 && it.y <= box.y2);
  const slots: FormationSlot[] = [];
  for (const j of jerseys) {
    // The name label sits ~7.8-7.9pt directly below its jersey number; a
    // same-row neighbor's leftover name label (for a jersey ~0.5pt away in
    // y) is excluded by requiring dy >= 5.
    let bestName: TextItem | null = null;
    let bestDx = Infinity;
    for (const it of items) {
      if (it === j || JERSEY_RE.test(it.str)) continue;
      if (it.x < box.x1 - 10 || it.x > box.x2 + 10 || it.y < box.y1 - 10 || it.y > box.y2 + 10) continue;
      const dy = j.y - it.y;
      if (dy < 5 || dy > 10) continue;
      const dx = Math.abs(j.x - it.x);
      if (dx < bestDx) {
        bestDx = dx;
        bestName = it;
      }
    }
    if (!bestName) continue;
    const xPct = ((j.x - box.x1) / (box.x2 - box.x1)) * 100;
    const yPct = ((box.y2 - j.y) / (box.y2 - box.y1)) * 100;
    slots.push({ jersey: Number(j.str), name: bestName.str, xPct: Math.max(0, Math.min(100, xPct)), yPct: Math.max(0, Math.min(100, yPct)) });
  }
  return slots;
}

export function parseFormationLineups(
  items: TextItem[],
  boxes: PathBox[],
  pageWidth: number
): { starting: { home: FormationSlot[]; away: FormationSlot[] }; final: { home: FormationSlot[]; away: FormationSlot[] } } {
  const headers = findHeaders(items, pageWidth);
  const bySide = { home: headers.filter((h) => h.side === "home"), away: headers.filter((h) => h.side === "away") };

  function pick(headersForSide: Header[], mode: "start" | "final"): FormationSlot[] {
    if (headersForSide.length === 0) return [];
    const h = mode === "start" ? headersForSide.reduce((a, b) => (a.start <= b.start ? a : b)) : headersForSide.reduce((a, b) => (a.end >= b.end ? a : b));
    const box = diagramBoxFor(h, boxes);
    return box ? slotsInBox(items, box) : [];
  }

  return {
    starting: { home: pick(bySide.home, "start"), away: pick(bySide.away, "start") },
    final: { home: pick(bySide.home, "final"), away: pick(bySide.away, "final") },
  };
}
