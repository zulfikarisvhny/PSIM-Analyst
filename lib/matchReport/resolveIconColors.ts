// lib/matchReport/resolveIconColors.ts
// Server-only. The cover page's goal/red-card markers and the lineup page's
// card/substitution markers are drawn as small colored vector icons (not
// text or images), so pdfjs's text-content API can't see them. This walks
// the page's raw operator list instead — tracking the current transform
// matrix through save/transform/restore and the active fill color through
// setFillRGBColor — to get each small filled shape's device-space center
// point and hex color. Confirmed against real exports: goal ball icons are
// gray (#333333/#000000), yellow cards #f7ca18, red cards #c81729,
// substitution-out arrows #d42e36, substitution-in arrows #2ab144 — a fixed
// Wyscout template convention, not team branding.
export interface IconFill {
  x: number;
  y: number;
  color: string; // lowercase hex, e.g. "#f7ca18"
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

/** All small (icon-sized) filled shapes on the page, with device-space position and fill color. */
export async function extractIconFills(pdfjsLib: any, page: any): Promise<IconFill[]> {
  const opList = await page.getOperatorList();
  const OPS = pdfjsLib.OPS;

  const stack: { ctm: Matrix; fillColor: string }[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  let fillColor = "#000000";
  const fills: IconFill[] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === OPS.save) {
      stack.push({ ctm, fillColor });
    } else if (fn === OPS.restore) {
      const s = stack.pop();
      if (s) {
        ctm = s.ctm;
        fillColor = s.fillColor;
      }
    } else if (fn === OPS.transform) {
      ctm = multiply(args as Matrix, ctm);
    } else if (fn === OPS.setFillRGBColor) {
      fillColor = args[0] as string;
    } else if (fn === OPS.constructPath) {
      const minMax = args[2] as number[] | undefined;
      if (!minMax) continue;
      const [minX, minY, maxX, maxY] = minMax;
      const [px, py] = applyPoint(ctm, (minX + maxX) / 2, (minY + maxY) / 2);
      fills.push({ x: px, y: py, color: fillColor });
    }
  }
  return fills;
}

const GOAL_COLORS = new Set(["#000000", "#333333"]);
const TYPE_BY_COLOR: Record<string, MarkerIconType> = {
  "#f7ca18": "yellow_card",
  "#c81729": "red_card",
  "#d42e36": "sub_out",
  "#2ab144": "sub_in",
};

export type MarkerIconType = "goal" | "yellow_card" | "red_card" | "sub_out" | "sub_in";

// px, |dx|+|dy| — genuine matches land within ~8-13px depending on the page.
// Kept tight by default because on the lineup page, two markers can share a
// row only ~15-20px apart (e.g. a card then a substitution on the same
// player), and a loose threshold would let one marker's classification bleed
// into its neighbor's. The cover page's goalscorer list has more room (each
// entry is its own row, ~18px apart) and needs a slightly larger default —
// callers pass their own maxDist accordingly.
const DEFAULT_MAX_DIST = 10;

/**
 * Finds the fill nearest an (x, y) minute-marker text item and classifies it.
 * Every icon is drawn as a colored shape sitting on top of a black/white
 * background badge, so a plain nearest-match would often land on the badge
 * instead of the shape that actually carries the meaning — this prefers the
 * nearest *meaningfully colored* fill (card/substitution colors) within
 * range, and only falls back to the grayscale badge (goal ball icon) when no
 * colored fill is nearby.
 */
export function classifyMarkerIcon(x: number, y: number, fills: IconFill[], maxDist: number = DEFAULT_MAX_DIST): MarkerIconType | null {
  let bestColored: { color: string; dist: number } | null = null;
  let bestGoal: number | null = null;
  for (const f of fills) {
    const d = Math.abs(f.x - x) + Math.abs(f.y - y);
    if (d > maxDist) continue;
    const type = TYPE_BY_COLOR[f.color];
    if (type && (!bestColored || d < bestColored.dist)) {
      bestColored = { color: f.color, dist: d };
    } else if (GOAL_COLORS.has(f.color) && (bestGoal === null || d < bestGoal)) {
      bestGoal = d;
    }
  }
  if (bestColored) return TYPE_BY_COLOR[bestColored.color];
  if (bestGoal !== null) return "goal";
  return null;
}
