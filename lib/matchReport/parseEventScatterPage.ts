// lib/matchReport/parseEventScatterPage.ts
// Parses the "Losses", "Recoveries", "Key Passes" and "Crosses" pages: each
// shows both teams side by side (home left, away right), each team split
// into a 1st-half and a 2nd-half mini-pitch, with one dot per event labeled
// by the player's jersey number. Unlike the POSITIONS page, these diagram
// boxes shift position per export (their page layout grows/shrinks with a
// combo-matrix table above them), so the caller locates them per-file via
// resolvePathBoxes.findEventDiagramBoxes() and passes them in here.
import type { TextItem } from "../pdf/textLayout";
import type { IconFill } from "./resolveIconColors";
import type { PathBox } from "./resolvePathBoxes";

export interface ScatterEvent {
  jersey: number;
  half: "1st" | "2nd";
  leadsToShot?: boolean;
  xPct: number; // 0-100, attack direction (that team's own goal = 0, opponent's goal = 100)
  yPct: number; // 0-100, touchline to touchline
}

const JERSEY_RE = /^\d{1,3}$/;
const YELLOW = "#ffff00";
const YELLOW_MAX_DIST = 6;

function toPct(x: number, y: number, box: PathBox): { xPct: number; yPct: number } {
  const xPct = ((x - box.x1) / (box.x2 - box.x1)) * 100;
  // PDF y increases upward; screen/SVG % increases downward — same flip as
  // parseAveragePositions.ts's toPct. Missing this here put every event's
  // row at the mirror-opposite side of the pitch width.
  const yPct = ((box.y2 - y) / (box.y2 - box.y1)) * 100;
  return { xPct: Math.max(0, Math.min(100, xPct)), yPct: Math.max(0, Math.min(100, yPct)) };
}

function hasYellowNear(x: number, y: number, fills: IconFill[]): boolean {
  return fills.some((f) => f.color === YELLOW && Math.abs(f.x - x) + Math.abs(f.y - y) <= YELLOW_MAX_DIST);
}

function collect(items: TextItem[], box: PathBox, half: "1st" | "2nd", fills: IconFill[], detectLeadsToShot: boolean): ScatterEvent[] {
  const out: ScatterEvent[] = [];
  for (const it of items) {
    if (!JERSEY_RE.test(it.str)) continue;
    if (it.x < box.x1 || it.x > box.x2 || it.y < box.y1 || it.y > box.y2) continue;
    const { xPct, yPct } = toPct(it.x, it.y, box);
    out.push({
      jersey: Number(it.str),
      half,
      ...(detectLeadsToShot ? { leadsToShot: hasYellowNear(it.x, it.y, fills) } : {}),
      xPct,
      yPct,
    });
  }
  return out;
}

export function parseEventScatterPage(
  items: TextItem[],
  boxes: { home1st: PathBox; home2nd: PathBox; away1st: PathBox; away2nd: PathBox },
  fills: IconFill[],
  detectLeadsToShot = false
): { home: ScatterEvent[]; away: ScatterEvent[] } {
  return {
    home: [...collect(items, boxes.home1st, "1st", fills, detectLeadsToShot), ...collect(items, boxes.home2nd, "2nd", fills, detectLeadsToShot)],
    away: [...collect(items, boxes.away1st, "1st", fills, detectLeadsToShot), ...collect(items, boxes.away2nd, "2nd", fills, detectLeadsToShot)],
  };
}
