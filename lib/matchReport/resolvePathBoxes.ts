// lib/matchReport/resolvePathBoxes.ts
// Server-only. Several report pages (Shots, Losses, Recoveries, Key Passes,
// Crosses) draw their location diagrams as a small rectangular pitch outline
// per team/half — but unlike the POSITIONS page's box (byte-identical across
// every export), these can shift vertically by however many rows a table
// above them needs (e.g. Key Passes' combo matrix grows with the number of
// distinct pass targets). So instead of hardcoding coordinates, this walks
// the page's raw operator list — same CTM-tracking technique as
// resolveIconColors.ts — and returns every filled/stroked shape's
// device-space bounding box, which callers filter by size to find the
// diagram outlines actually present in a given export.
import type { TextItem } from "../pdf/textLayout";

export interface PathBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
}

type Matrix = [number, number, number, number, number, number];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

function applyPoint(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export async function extractPathBoxes(pdfjsLib: any, page: any): Promise<PathBox[]> {
  const opList = await page.getOperatorList();
  const OPS = pdfjsLib.OPS;

  const stack: Matrix[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const boxes: PathBox[] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === OPS.save) {
      stack.push(ctm);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() ?? ctm;
    } else if (fn === OPS.transform) {
      ctm = multiply(args as Matrix, ctm);
    } else if (fn === OPS.constructPath) {
      const minMax = args[2] as number[] | undefined;
      if (!minMax) continue;
      const [minX, minY, maxX, maxY] = minMax;
      const [px1, py1] = applyPoint(ctm, minX, minY);
      const [px2, py2] = applyPoint(ctm, maxX, maxY);
      const x1 = Math.min(px1, px2);
      const x2 = Math.max(px1, px2);
      const y1 = Math.min(py1, py2);
      const y2 = Math.max(py1, py2);
      boxes.push({ x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 });
    }
  }
  return boxes;
}

/**
 * Finds the four "team x half" mini-pitch outlines on a Losses / Recoveries /
 * Key Passes / Crosses page. The real layout is two STACKED ROWS, one per
 * team (each team's own section header — "PSIM Yogyakarta", "Persita" — sits
 * directly above its row), and *within* each row the two boxes are 1st half
 * (left) then 2nd half (right) — confirmed against a real export where
 * assuming the opposite split (columns = team, rows = half, as if it mirrored
 * the POSITIONS page's layout) silently merged half of each team's events
 * into the other team's data. Matches candidate boxes by size (`w`/`h`
 * within tolerance of the page's own most common box footprint, since the
 * four diagram boxes are the only shapes repeated exactly four times) rather
 * than a hardcoded size, so it keeps working if a page's template changes
 * the diagram's dimensions. Which row belongs to which team is resolved by
 * proximity to that team's own name label (printed directly above its row)
 * rather than assuming the home team is always on top — a report doesn't
 * reliably order PSIM first regardless of true home/away status.
 */
export function findEventDiagramBoxes(
  boxes: PathBox[],
  items: TextItem[],
  homeTeamName: string | null,
  awayTeamName: string | null
): { home1st: PathBox; home2nd: PathBox; away1st: PathBox; away2nd: PathBox } | null {
  const key = (b: PathBox) => `${b.w.toFixed(0)}x${b.h.toFixed(0)}`;
  const counts = new Map<string, PathBox[]>();
  for (const b of boxes) {
    if (b.w < 150 || b.w > 350 || b.h < 100 || b.h > 250) continue; // plausible mini-pitch footprint only
    const k = key(b);
    if (!counts.has(k)) counts.set(k, []);
    counts.get(k)!.push(b);
  }
  const group = [...counts.values()].find((g) => g.length === 4);
  if (!group) return null;

  // Rows = team (PDF y increases upward, so the higher y1 pair is the top row); within each row, left (lower x1) = 1st half, right = 2nd half.
  const byY = [...group].sort((a, b) => b.y1 - a.y1);
  const topRow = byY.slice(0, 2).sort((a, b) => a.x1 - b.x1);
  const bottomRow = byY.slice(2, 4).sort((a, b) => a.x1 - b.x1);
  if (topRow.length !== 2 || bottomRow.length !== 2) return null;

  const topEdge = Math.max(topRow[0].y2, topRow[1].y2);
  const homeLabelY = homeTeamName ? items.find((it) => it.str === homeTeamName)?.y ?? null : null;
  const awayLabelY = awayTeamName ? items.find((it) => it.str === awayTeamName)?.y ?? null : null;
  // A team's name label sits above its own row, so its y (PDF-up) should be >= that row's top edge; the closer label (smaller gap) identifies the row.
  const homeGap = homeLabelY !== null && homeLabelY >= topEdge ? homeLabelY - topEdge : Infinity;
  const awayGap = awayLabelY !== null && awayLabelY >= topEdge ? awayLabelY - topEdge : Infinity;
  const topIsHome = homeGap <= awayGap; // defaults to true (home on top) if neither label was found

  const homeRow = topIsHome ? topRow : bottomRow;
  const awayRow = topIsHome ? bottomRow : topRow;

  return { home1st: homeRow[0], home2nd: homeRow[1], away1st: awayRow[0], away2nd: awayRow[1] };
}
