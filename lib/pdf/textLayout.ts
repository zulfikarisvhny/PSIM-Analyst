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
