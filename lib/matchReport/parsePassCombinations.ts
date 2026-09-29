// lib/matchReport/parsePassCombinations.ts
// Parses the two "PASSES" pages (one per team) of the Wyscout match report:
// an N x N grid of pass counts between every pair of players (row = passer,
// column = receiver), a row total per player (passes made), and a team-level
// "passes by third" split (def/mid/final) shown once near the top.
//
// Layout is entirely position-driven, like the MATCH DYNAMICS page: the
// column-header row (jersey numbers) sits exactly one row-height above the
// first player row, and grid cells line up with those header x-positions —
// same "bucket by nearest known x" technique used for the time-segment
// charts, just in two dimensions here (row y AND column x).
import { groupRows, dedupeNearby, type TextItem } from "../pdf/textLayout";

const JERSEY_RE = /^\d{1,3}$/;
const CELL_X_TOLERANCE = 6;
const ROW_Y_TOLERANCE = 3;

export interface PassCombination {
  fromJersey: number;
  toJersey: number;
  passCount: number;
}

export interface PlayerPassRow {
  jersey: number;
  name: string;
  totalPasses: number; // row total — passes this player made
}

export interface ThirdsSplit {
  def: number;
  mid: number;
  final: number;
}

export interface TeamPassSummary {
  combinations: PassCombination[];
  players: PlayerPassRow[];
  thirds: ThirdsSplit | null;
}

function parseThirds(items: TextItem[]): ThirdsSplit | null {
  const pctItems = items.filter((it) => /^\d+%$/.test(it.str) && it.y > 680 && it.y < 710);
  const unique = dedupeNearby(pctItems);
  if (unique.length < 3) return null;
  return { def: Number(unique[0].str.replace("%", "")), mid: Number(unique[1].str.replace("%", "")), final: Number(unique[2].str.replace("%", "")) };
}

export function parsePassCombinationPage(items: TextItem[]): TeamPassSummary {
  const thirds = parseThirds(items);

  const rows = groupRows(items, ROW_Y_TOLERANCE);
  // A "player row" has a name (non-numeric text) around x 76-84, right after
  // its jersey number. The column-header row has only jersey numbers there.
  const playerRows = rows
    .map((row) => {
      const nameItem = row.find((it) => it.x >= 76 && it.x <= 86 && !JERSEY_RE.test(it.str));
      if (!nameItem) return null;
      const jerseyItem = row.find((it) => it.x < 76 && JERSEY_RE.test(it.str));
      if (!jerseyItem) return null;
      const numericCells = dedupeNearby(row.filter((it) => it !== jerseyItem && it !== nameItem && /^-?\d+(\.\d+)?$/.test(it.str)));
      const rightMost = numericCells.reduce((max, it) => (it.x > max.x ? it : max), numericCells[0]);
      const gridCells = numericCells.filter((it) => it !== rightMost);
      return {
        y: row[0].y,
        jersey: Number(jerseyItem.str),
        name: nameItem.str.replace(/\s*\(\d+'\)\s*$/, "").trim(),
        total: rightMost ? Number(rightMost.str) : 0,
        cells: gridCells,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.y - a.y);

  if (playerRows.length === 0) return { combinations: [], players: [], thirds };

  // Column headers: the row exactly one row-height above the first player row.
  const rowSpacing = playerRows.length > 1 ? playerRows[0].y - playerRows[1].y : 21;
  const headerY = playerRows[0].y + rowSpacing;
  const headerRow = rows.find((r) => Math.abs(r[0].y - headerY) <= ROW_Y_TOLERANCE + 2 && r.some((it) => JERSEY_RE.test(it.str) && it.x > 100));
  const columns = (headerRow ?? []).filter((it) => JERSEY_RE.test(it.str) && it.x > 100).sort((a, b) => a.x - b.x);

  const players: PlayerPassRow[] = playerRows.map((r) => ({ jersey: r.jersey, name: r.name, totalPasses: r.total }));

  const combinations: PassCombination[] = [];
  for (const row of playerRows) {
    for (const cell of row.cells) {
      const col = columns.reduce<{ item: TextItem; dist: number } | null>((best, c) => {
        const dist = Math.abs(c.x - cell.x);
        if (dist > CELL_X_TOLERANCE) return best;
        if (!best || dist < best.dist) return { item: c, dist };
        return best;
      }, null);
      if (!col) continue; // couldn't confidently match this number to a column — skip rather than guess
      combinations.push({ fromJersey: row.jersey, toJersey: Number(col.item.str), passCount: Number(cell.str) });
    }
  }

  return { combinations, players, thirds };
}
