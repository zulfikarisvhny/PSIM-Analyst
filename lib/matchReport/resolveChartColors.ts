// lib/matchReport/resolveChartColors.ts
// Server-only. The "MATCH DYNAMICS" page's chart data-point labels are drawn
// with a gradient-shading pattern fill instead of a plain color — pdfjs's
// text-content API (used everywhere else in this app) doesn't expose that,
// so this reads the raw PDF object graph with pdf-lib to resolve each
// pattern name to its actual RGB. Confirmed against a real export: home
// team's labels are pure black (0,0,0), away team's are Wyscout blue
// (74,144,226) — this is a fixed template convention, not team branding.
import { PDFDocument, PDFName, PDFDict, PDFStream, PDFRawStream, PDFArray } from "pdf-lib";

export interface ColorFill {
  x: number;
  y: number;
  rgb: [number, number, number];
}

/**
 * Cross-references pdfjs's operator list (which text draw used which named
 * pattern, and that pattern's placement matrix) against the PDF's own
 * /Pattern resource dictionary (resolved via pdf-lib) to get one (x, y, rgb)
 * per colored text label on the page. Positions land a few pixels off from
 * the matching text item's baseline (pattern matrix vs glyph origin) but
 * consistently so — callers match by nearest position, not exact equality.
 */
export async function extractPatternFills(pdfjsLib: any, page: any, pdfBytes: Uint8Array, pageIndex0Based: number): Promise<ColorFill[]> {
  let patternDict: PDFDict;
  try {
    const libDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const libPage = libDoc.getPage(pageIndex0Based);
    const resources = libPage.node.Resources();
    if (!resources) return [];
    const found = resources.lookupMaybe(PDFName.of("Pattern"), PDFDict);
    if (!found) return [];
    patternDict = found;

    const colorCache = new Map<string, [number, number, number] | null>();
    function resolveColor(name: string): [number, number, number] | null {
      if (colorCache.has(name)) return colorCache.get(name)!;
      let rgb: [number, number, number] | null = null;
      try {
        const pattern = patternDict.lookup(PDFName.of(name), PDFDict);
        const shading = pattern.lookup(PDFName.of("Shading"), PDFDict);
        const func = shading.lookup(PDFName.of("Function"), PDFDict);
        const functions = func.lookup(PDFName.of("Functions"), PDFArray);
        const sub0 = libDoc.context.lookup(functions.get(0), PDFStream);
        if (!(sub0 instanceof PDFRawStream)) throw new Error("not a raw stream");
        const bytes = sub0.contents;
        rgb = [bytes[0], bytes[1], bytes[2]];
      } catch {
        rgb = null;
      }
      colorCache.set(name, rgb);
      return rgb;
    }

    const opList = await page.getOperatorList();
    const setFillColorNOp = pdfjsLib.OPS.setFillColorN;
    const fills: ColorFill[] = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] !== setFillColorNOp) continue;
      const args = opList.argsArray[i];
      if (args[0] !== "Shading") continue;
      const m = /_(\d+)$/.exec(args[1] as string);
      if (!m) continue;
      const rgb = resolveColor(`Pat${m[1]}`);
      if (!rgb) continue;
      const matrix = args[2] as number[];
      fills.push({ x: matrix[4], y: matrix[5], rgb });
    }
    return fills;
  } catch (err) {
    // No /Pattern resources (a differently-exported PDF) — caller falls back
    // to the anchor-based heuristic. Logged since a silent failure here would
    // otherwise be indistinguishable from "this export has no chart colors".
    console.warn("extractPatternFills: falling back, could not resolve chart colors:", err);
    return [];
  }
}

const HOME_RGB: [number, number, number] = [0, 0, 0];
const AWAY_RGB: [number, number, number] = [74, 144, 226];
const CLASSIFY_TOLERANCE = 30; // sum of per-channel abs diff
const POSITION_MAX_DIST = 15; // px, |dx|+|dy| — genuine matches land around ~5px in testing

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

/** Finds the fill nearest an (x, y) text item and classifies it as home/away by color, or null if no confident match. */
export function classifyItemColor(x: number, y: number, fills: ColorFill[]): "home" | "away" | null {
  let best: ColorFill | null = null;
  let bestDist = Infinity;
  for (const f of fills) {
    const d = Math.abs(f.x - x) + Math.abs(f.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  if (!best || bestDist > POSITION_MAX_DIST) return null;
  if (colorDist(best.rgb, HOME_RGB) <= CLASSIFY_TOLERANCE) return "home";
  if (colorDist(best.rgb, AWAY_RGB) <= CLASSIFY_TOLERANCE) return "away";
  return null;
}
