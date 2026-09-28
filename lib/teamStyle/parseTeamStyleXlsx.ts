// lib/teamStyle/parseTeamStyleXlsx.ts
// TypeScript port of extract-PDF/extract_team_style_stats.py, so the browser-
// upload flow doesn't depend on a Python process server-side. Keep the two in
// sync: same column-grouping algorithm, same slug(), same averaging formulas.
//
// Input: a Wyscout "Team Stats" xlsx export — one header row, two rows of
// AVERAGE()-formula summaries (skipped), then two data rows per match (the
// team's own stats row + the opponent's stats row, distinguished by the
// "Team" column). Unlike the Python script (which takes one target team name
// via CLI arg), this parses EVERY team found in the file so the browser can
// show a preview and let the user pick which to import.
import ExcelJS from "exceljs";
import { slug } from "../slug";

const SKIP_LABELS = new Set(["Date", "Match", "Competition", "Duration", "Team", "Scheme"]);

export interface TeamStyleMetrics {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  possessionPct: number | null;
  directPct: number | null;
  passAccuracyPct: number | null;
  xgPerShot: number | null;
  proactiveDefPct: number | null;
  stepOutPct: number | null;
  aerialPct: number | null;
}

export interface TeamStyleResult {
  teamName: string;
  metrics: TeamStyleMetrics;
}

interface ColumnGroup {
  label: string;
  start: number; // 0-indexed column position
  size: number;
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v && typeof (v as { result: unknown }).result === "number") {
    return (v as { result: number }).result;
  }
  return null;
}

function cellString(v: ExcelJS.CellValue): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "result" in v && typeof (v as { result: unknown }).result === "string") {
    return (v as { result: string }).result;
  }
  return null;
}

/** Forward-fills blank header cells with the last real label, then groups consecutive same-label columns. */
function buildGroups(header: (string | null)[]): ColumnGroup[] {
  const filled: (string | null)[] = [];
  let last: string | null = null;
  for (const h of header) {
    if (typeof h === "string" && h.trim()) last = h.trim();
    filled.push(last);
  }
  const groups: ColumnGroup[] = [];
  let i = 0;
  while (i < filled.length) {
    const label = filled[i];
    let j = i;
    while (j < filled.length && filled[j] === label) j++;
    if (label !== null) groups.push({ label, start: i, size: j - i });
    i = j;
  }
  return groups;
}

function rowToStats(row: ExcelJS.CellValue[], groups: ColumnGroup[]): Record<string, number | null> {
  const stats: Record<string, number | null> = {};
  for (const { label, start, size } of groups) {
    if (SKIP_LABELS.has(label)) continue;
    if (label === "Possession, %") {
      stats.possession_pct = cellNumber(row[start]);
      continue;
    }
    const base = slug(label);
    if (size === 1) {
      stats[base] = cellNumber(row[start]);
    } else if (size === 3) {
      stats[`${base}_total`] = cellNumber(row[start]);
      stats[`${base}_success`] = cellNumber(row[start + 1]);
      stats[`${base}_pct`] = cellNumber(row[start + 2]);
    } else if (size === 4) {
      const parts = label.split(" / ").map((p) => p.trim());
      stats[`${slug(parts[0])}_total`] = cellNumber(row[start]);
      parts.slice(1).forEach((p, k) => {
        stats[`${slug(parts[0])}_${slug(p)}`] = cellNumber(row[start + 1 + k]);
      });
    }
  }
  return stats;
}

function average(rows: Record<string, number | null>[], key: string): number | null {
  const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function computeMetrics(rows: Record<string, number | null>[]): TeamStyleMetrics {
  const avgXg = average(rows, "xg");
  const avgShotsTotal = average(rows, "shots_on_target_total");
  const avgInterceptions = average(rows, "interceptions");
  const avgRecoveries = average(rows, "recoveries_total");
  const avgSlidingTackles = average(rows, "sliding_tackles_successful_total");
  const avgClearances = average(rows, "clearances");
  const avgAerialTotal = average(rows, "aerial_duels_won_total");
  const avgDuelsTotal = average(rows, "duels_won_total");

  let wins = 0,
    draws = 0,
    losses = 0;
  for (const row of rows) {
    const gf = row.goals;
    const ga = row.conceded_goals;
    if (typeof gf !== "number" || typeof ga !== "number") continue;
    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;
  }

  return {
    matchesPlayed: rows.length,
    wins,
    draws,
    losses,
    possessionPct: average(rows, "possession_pct"),
    directPct: average(rows, "long_pass"),
    passAccuracyPct: average(rows, "passes_accurate_pct"),
    xgPerShot: avgXg !== null && avgShotsTotal ? avgXg / avgShotsTotal : null,
    proactiveDefPct: avgInterceptions !== null && avgRecoveries ? (100 * avgInterceptions) / (avgInterceptions + avgRecoveries) : null,
    stepOutPct: avgSlidingTackles !== null && avgClearances ? (100 * avgSlidingTackles) / (avgSlidingTackles + avgClearances) : null,
    aerialPct: avgAerialTotal !== null && avgDuelsTotal ? (100 * avgAerialTotal) / avgDuelsTotal : null,
  };
}

export async function parseTeamStyleXlsx(fileBytes: Uint8Array): Promise<TeamStyleResult[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's .d.ts and this project's @types/node disagree on Buffer's generic
  // shape (a version-mismatch type quirk, not a real incompatibility) — same
  // runtime shape either way, so bypass the structural check here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(fileBytes) as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in this file");

  const headerRow = sheet.getRow(1).values as ExcelJS.CellValue[];
  // ExcelJS row.values is 1-indexed with a leading placeholder at [0] — drop it
  // so column positions line up 0-indexed, matching the Python port exactly.
  const header = headerRow.slice(1).map((h) => cellString(h));
  const groups = buildGroups(header);

  // Some exports have 2 "team average" formula rows between the header and the
  // real match rows (row 2/3 hold formulas like AVERAGE(G4,G6), not a date);
  // others have none, so real data starts right at row 2. Rather than assume a
  // fixed offset, skip any row whose Date column isn't an actual date.
  const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
  const rowsByTeam = new Map<string, Record<string, number | null>[]>();
  for (let r = 2; r <= sheet.rowCount; r++) {
    const raw = (sheet.getRow(r).values as ExcelJS.CellValue[]).slice(1);
    const dateCell = raw[0];
    const isDate = dateCell instanceof Date || (typeof cellString(dateCell) === "string" && DATE_RE.test(cellString(dateCell)!));
    if (!isDate) continue;
    const teamName = cellString(raw[4]); // column index 4 = "Team"
    if (!teamName) continue;
    const stats = rowToStats(raw, groups);
    if (!rowsByTeam.has(teamName)) rowsByTeam.set(teamName, []);
    rowsByTeam.get(teamName)!.push(stats);
  }

  return Array.from(rowsByTeam.entries()).map(([teamName, rows]) => ({
    teamName,
    metrics: computeMetrics(rows),
  }));
}
