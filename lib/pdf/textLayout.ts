// lib/pdf/textLayout.ts
// Shared pdfjs-dist helpers used by every PDF parser in this app (match
// reports, Catapult physical-stats reports, ...): load a page's text items
// with x/y position, then group them into visual rows for column parsing.
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

// pdfjs-dist ships as ESM; the legacy build works in a plain Node server context.
export async function loadPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export async function getPageItems(page: any): Promise<TextItem[]> {
  const content = await page.getTextContent();
  return content.items
    .map((it: any) => ({ str: (it.str as string).trim(), x: it.transform[4] as number, y: it.transform[5] as number, width: it.width as number }))
    .filter((it: TextItem) => it.str !== "");
}

/** Groups items into rows (same y, within a small tolerance), each row sorted left-to-right, rows sorted top-to-bottom. */
export function groupRows(items: TextItem[], tolerance = 2): TextItem[][] {
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of items) {
    let row = rows.find((r) => Math.abs(r.y - item.y) <= tolerance);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).map((r) => r.items.sort((a, b) => a.x - b.x));
}

/**
 * Wyscout's PDF export double-paints some text a pixel or two apart (bold
 * emphasis on certain rows — seen on pass-grid totals and Shots-page rows
 * alike, not tied to the value itself). Drops any item within `thresholdPx`
 * of the previously *kept* item once sorted by x, rather than a fixed
 * rounding grid, since a rounding boundary can fall inside a genuine
 * duplicate's tiny spread and wrongly split it into two "clusters".
 */
export function dedupeNearby<T extends { x: number }>(items: T[], thresholdPx = 3): T[] {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const out: T[] = [];
  for (const it of sorted) {
    if (out.length > 0 && it.x - out[out.length - 1].x <= thresholdPx) continue;
    out.push(it);
  }
  return out;
}
