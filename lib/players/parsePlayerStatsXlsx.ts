// lib/players/parsePlayerStatsXlsx.ts
// TypeScript port of extract-PDF/extract_player_stats.py, so the browser-
// upload flow doesn't depend on a Python process server-side. Keep the two in
// sync: same core-field list, same slug() (note: NOT lib/slug.ts — this one
// maps "%" -> "pct" before slugging, which is what the live player_season_stats
// data actually uses, e.g. "Duels won, %" -> "duels_won_pct").
import ExcelJS from "exceljs";

const CORE_FIELD_NAMES = new Set([
  "Player",
  "Team",
  "Position",
  "Age",
  "Market value",
  "Contract expires",
  "Matches played",
  "Minutes played",
  "Goals",
  "xG",
  "Assists",
  "xA",
  "Team within selected timeframe",
]);

export function slugWyscout(label: string): string {
  const pre = label.toLowerCase().replace(/%/g, "pct").replace(/\//g, " ").replace(/,/g, "");
  return pre.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function positionGroup(pos: string | null): string | null {
  if (!pos) return null;
  const first = pos.split(",")[0].trim().toUpperCase();
  if (first === "GK") return "GK";
  if (["CB", "RB", "LB", "WB", "DF"].some((k) => first.includes(k))) return "DF";
  if (["DMF", "CMF", "AMF", "MF"].some((k) => first.includes(k))) return "MF";
  if (["W", "CF", "ST", "FW"].some((k) => first.includes(k))) return "FW";
  return null;
}

export interface ParsedPlayerRow {
  player: string;
  team: string; // "Team within selected timeframe" — the club this row's stats belong to
  position: string | null;
  positionGroup: string | null;
  age: number | null;
  marketValue: number | null;
  contractExpires: string | null;
  matchesPlayed: number | null;
  minutesPlayed: number | null;
  goals: number | null;
  xg: number | null;
  assists: number | null;
  xa: number | null;
  nationality: string | null; // "Passport country"
  foot: string | null;
  stats: Record<string, string | number | null>;
}

function cellValue(v: ExcelJS.CellValue): string | number | null {
  if (typeof v === "string" || typeof v === "number") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v && typeof v === "object" && "result" in v) {
    const r = (v as { result: unknown }).result;
    return typeof r === "string" || typeof r === "number" ? r : null;
  }
  return null;
}

function cellString(v: ExcelJS.CellValue): string | null {
  const c = cellValue(v);
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  const c = cellValue(v);
  return typeof c === "number" ? c : null;
}

export async function parsePlayerStatsXlsx(fileBytes: Uint8Array): Promise<ParsedPlayerRow[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(fileBytes) as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in this file");

  const headerRow = (sheet.getRow(1).values as ExcelJS.CellValue[]).slice(1);
  const headers = headerRow.map((h) => cellString(h) ?? "");

  const rows: ParsedPlayerRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const raw = (sheet.getRow(r).values as ExcelJS.CellValue[]).slice(1);
    const byHeader = new Map<string, ExcelJS.CellValue>();
    headers.forEach((h, i) => byHeader.set(h, raw[i]));

    const player = cellString(byHeader.get("Player"));
    const team = cellString(byHeader.get("Team within selected timeframe"));
    if (!player || !team) continue;

    const stats: Record<string, string | number | null> = {};
    const seen = new Map<string, number>();
    for (const h of headers) {
      if (!h || CORE_FIELD_NAMES.has(h)) continue;
      let key = slugWyscout(h);
      const count = seen.get(key);
      if (count) {
        seen.set(key, count + 1);
        key = `${key}_${count + 1}`;
      } else {
        seen.set(key, 1);
      }
      stats[key] = cellValue(byHeader.get(h));
    }

    rows.push({
      player,
      team,
      position: cellString(byHeader.get("Position")),
      positionGroup: positionGroup(cellString(byHeader.get("Position"))),
      age: cellNumber(byHeader.get("Age")),
      marketValue: cellNumber(byHeader.get("Market value")),
      contractExpires: cellString(byHeader.get("Contract expires")),
      matchesPlayed: cellNumber(byHeader.get("Matches played")),
      minutesPlayed: cellNumber(byHeader.get("Minutes played")),
      goals: cellNumber(byHeader.get("Goals")),
      xg: cellNumber(byHeader.get("xG")),
      assists: cellNumber(byHeader.get("Assists")),
      xa: cellNumber(byHeader.get("xA")),
      nationality: cellString(byHeader.get("Passport country")),
      foot: cellString(byHeader.get("Foot")),
      stats,
    });
  }

  return rows;
}
