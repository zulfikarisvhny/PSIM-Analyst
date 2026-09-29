// lib/matchReport/parseAveragePositions.ts
// Parses the "POSITIONS" page's *average positions* pitch diagram — a small
// pitch per team with each player's jersey number placed at the average
// point of all actions where they touched the ball (Wyscout's own metric
// definition). Confirmed against 3 real exports: the outer pitch box's PDF
// coordinates are byte-identical across matches (a fixed template), so the
// home/away boxes below are hardcoded rather than re-detected per file.
import type { TextItem } from "../pdf/textLayout";

export interface AveragePosition {
  jersey: number;
  xPct: number; // 0-100, left to right
  yPct: number; // 0-100, own-goal end to opponent's end (screen-space, not PDF's upward y)
}

interface PitchBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const HOME_PITCH: PitchBox = { x1: 14.4, y1: 364.28, x2: 266.4, y2: 743.9 };
const AWAY_PITCH: PitchBox = { x1: 309.6, y1: 364.28, x2: 561.6, y2: 743.9 };
const JERSEY_RE = /^\d{1,3}$/;

function toPct(x: number, y: number, box: PitchBox): { xPct: number; yPct: number } {
  const xPct = ((x - box.x1) / (box.x2 - box.x1)) * 100;
  const yPct = ((box.y2 - y) / (box.y2 - box.y1)) * 100; // PDF y increases upward; screen % increases downward
  return { xPct: Math.max(0, Math.min(100, xPct)), yPct: Math.max(0, Math.min(100, yPct)) };
}

export function parseAveragePositions(items: TextItem[]): { home: AveragePosition[]; away: AveragePosition[] } {
  const home: AveragePosition[] = [];
  const away: AveragePosition[] = [];
  for (const it of items) {
    if (!JERSEY_RE.test(it.str)) continue;
    if (it.y < HOME_PITCH.y1 || it.y > HOME_PITCH.y2) continue; // excludes the formation-phase mini-diagrams further down the page
    if (it.x >= HOME_PITCH.x1 && it.x <= HOME_PITCH.x2) {
      const { xPct, yPct } = toPct(it.x, it.y, HOME_PITCH);
      home.push({ jersey: Number(it.str), xPct, yPct });
    } else if (it.x >= AWAY_PITCH.x1 && it.x <= AWAY_PITCH.x2) {
      const { xPct, yPct } = toPct(it.x, it.y, AWAY_PITCH);
      away.push({ jersey: Number(it.str), xPct, yPct });
    }
  }
  return { home, away };
}
