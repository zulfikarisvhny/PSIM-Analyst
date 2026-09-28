// lib/matchReport/parseTimeSegments.ts
// Parses the "MATCH DYNAMICS" page: 8 metrics (Ball possession, Pass
// accuracy, Long pass share, Duels win rate, Attacks per minute, Recoveries
// per minute, Average formation line, Pressing intensity (PPDA)), each with
// a clean Total/1st half/2nd half mini-table plus a line chart broken into 6
// fifteen-minute buckets (1-15, 16-30, 31-45+, 46-60, 61-75, 76-90+).
//
// Each bucket's two data-point labels (one per team) carry no team name in
// the PDF text layer, but they ARE drawn in the team's real chart color
// (home = black, away = blue, a fixed Wyscout template convention) — see
// resolveChartColors.ts, which reads that color straight from the PDF's
// pattern-fill objects. That's the primary, reliable signal used here. Only
// if color resolution comes back empty (a differently-exported PDF, say) do
// we fall back to guessing the assignment by whichever pairing's
// duration-weighted average best matches the already-reliable 1st-half/
// 2nd-half/Total figures from the mini-table — a much weaker signal that can
// pick the wrong side when a team's numbers are close or tied.
import { slug } from "../slug";
import { groupRows, type TextItem } from "../pdf/textLayout";
import { classifyItemColor, type ColorFill } from "./resolveChartColors";

const METRIC_HEADERS = [
  "Ball possession, %",
  "Pass accuracy, %",
  "Long pass share, %",
  "Duels win rate",
  "Attacks per minute",
  "Recoveries per minute",
  "Average formation line, m",
  "Pressing intensity (PPDA)",
];

const SEGMENT_LABELS = ["1-15", "16-30", "31-45+", "46-60", "61-75", "76-90+"];
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const SEGMENT_X_TOLERANCE = 10;
const LAST_ROW_FLOOR_Y = 40; // stays clear of the page-number footer

export interface TimeSegmentMetric {
  metric: string; // slug, e.g. "ball_possession"
  label: string;
  total: number | null;
  firstHalf: number | null;
  secondHalf: number | null;
  buckets: number[] | null; // 6 values, chronological (1-15 ... 76-90+), or null if the chart couldn't be read
}

export interface TimeSegmentsResult {
  home: TimeSegmentMetric[];
  away: TimeSegmentMetric[];
}

function parseNumeric(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace("%", "").trim();
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Picks, per bucket (6 total), which of its [a,b] candidate pair is home's vs
 * away's — by brute-forcing all 2^6 assignments (cheap) and keeping whichever
 * minimizes squared error against three known-reliable anchors from the
 * mini-table: the 1st-half average, 2nd-half average, and full-match
 * average, each duration-weighted. This is a best-effort heuristic, not a
 * guarantee: when a team's home/away values are close or tied across every
 * anchor (an evenly-matched half or match), several assignments can fit
 * equally well and the wrong one may be picked — there's no team-color
 * signal in the PDF's text layer to fall back on. The Import preview lets
 * you manually swap any bucket that looks wrong before committing.
 */
function bestBucketAssignment(
  bins: [number, number][],
  firstHalfWeights: number[],
  secondHalfWeights: number[],
  targetHomeFirst: number | null,
  targetAwayFirst: number | null,
  targetHomeSecond: number | null,
  targetAwaySecond: number | null,
  targetHomeTotal: number | null,
  targetAwayTotal: number | null
): boolean[] {
  const n = bins.length; // 6
  const firstWeight = firstHalfWeights.reduce((a, b) => a + b, 0);
  const secondWeight = secondHalfWeights.reduce((a, b) => a + b, 0);
  const totalWeight = firstWeight + secondWeight;
  let best: boolean[] = new Array(n).fill(false);
  let bestError = Infinity;

  for (let mask = 0; mask < 1 << n; mask++) {
    const swap = Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1);
    let homeFirst = 0;
    let awayFirst = 0;
    for (let i = 0; i < 3; i++) {
      const [a, b] = bins[i];
      homeFirst += (swap[i] ? b : a) * firstHalfWeights[i];
      awayFirst += (swap[i] ? a : b) * firstHalfWeights[i];
    }
    let homeSecond = 0;
    let awaySecond = 0;
    for (let i = 3; i < 6; i++) {
      const [a, b] = bins[i];
      homeSecond += (swap[i] ? b : a) * secondHalfWeights[i - 3];
      awaySecond += (swap[i] ? a : b) * secondHalfWeights[i - 3];
    }

    let err = 0;
    if (targetHomeFirst !== null) err += (homeFirst / firstWeight - targetHomeFirst) ** 2;
    if (targetAwayFirst !== null) err += (awayFirst / firstWeight - targetAwayFirst) ** 2;
    if (targetHomeSecond !== null) err += (homeSecond / secondWeight - targetHomeSecond) ** 2;
    if (targetAwaySecond !== null) err += (awaySecond / secondWeight - targetAwaySecond) ** 2;
    if (targetHomeTotal !== null) err += ((homeFirst + homeSecond) / totalWeight - targetHomeTotal) ** 2;
    if (targetAwayTotal !== null) err += ((awayFirst + awaySecond) / totalWeight - targetAwayTotal) ** 2;

    if (err < bestError) {
      bestError = err;
      best = swap;
    }
  }
  return best;
}

function parseMetricBlock(
  items: TextItem[],
  homeTeam: string,
  awayTeam: string,
  firstHalfAdded: number,
  secondHalfAdded: number,
  colorFills: ColorFill[]
): { home: Omit<TimeSegmentMetric, "metric" | "label">; away: Omit<TimeSegmentMetric, "metric" | "label"> } {
  const rows = groupRows(items, 2);

  const homeRow = rows.find((r) => r.some((it) => it.str === homeTeam));
  const awayRow = rows.find((r) => r.some((it) => it.str === awayTeam));
  const readTriple = (row: TextItem[] | undefined, teamName: string) => {
    if (!row) return { total: null, firstHalf: null, secondHalf: null };
    const rest = row.filter((it) => it.str !== teamName).sort((a, b) => a.x - b.x);
    return {
      total: parseNumeric(rest[0]?.str),
      firstHalf: parseNumeric(rest[1]?.str),
      secondHalf: parseNumeric(rest[2]?.str),
    };
  };
  const homeTriple = readTriple(homeRow, homeTeam);
  const awayTriple = readTriple(awayRow, awayTeam);

  const segmentTicks = items.filter((it) => SEGMENT_LABELS.includes(it.str)).sort((a, b) => a.x - b.x);
  if (segmentTicks.length !== 6 || !homeRow || !awayRow) {
    return { home: { ...homeTriple, buckets: null }, away: { ...awayTriple, buckets: null } };
  }
  const segmentXs = segmentTicks.map((it) => it.x);
  const axisY = segmentTicks[0].y;
  const teamRowsMinY = Math.min(...homeRow.map((it) => it.y), ...awayRow.map((it) => it.y));

  const dataItems = items.filter((it) => NUMERIC_RE.test(it.str) && it.y > axisY + 3 && it.y < teamRowsMinY - 3);

  const bucketItems: TextItem[][] = segmentXs.map((segX) =>
    dataItems.filter((it) => Math.abs(it.x - segX) <= SEGMENT_X_TOLERANCE).sort((a, b) => b.y - a.y)
  );
  if (bucketItems.some((its) => its.length === 0)) {
    return { home: { ...homeTriple, buckets: null }, away: { ...awayTriple, buckets: null } };
  }

  const homeBuckets: number[] = [];
  const awayBuckets: number[] = [];
  let colorFailed = false;
  for (const its of bucketItems) {
    if (its.length === 1) {
      // Tied value — same number either way, no need to disambiguate.
      homeBuckets.push(Number(its[0].str));
      awayBuckets.push(Number(its[0].str));
      continue;
    }
    const [itemA, itemB] = its;
    const colorA = classifyItemColor(itemA.x, itemA.y, colorFills);
    const colorB = classifyItemColor(itemB.x, itemB.y, colorFills);
    if (colorA === "home" && colorB === "away") {
      homeBuckets.push(Number(itemA.str));
      awayBuckets.push(Number(itemB.str));
    } else if (colorA === "away" && colorB === "home") {
      homeBuckets.push(Number(itemB.str));
      awayBuckets.push(Number(itemA.str));
    } else {
      colorFailed = true;
      homeBuckets.push(NaN); // placeholder, overwritten by the fallback pass below
      awayBuckets.push(NaN);
    }
  }

  if (colorFailed) {
    // Color resolution didn't cleanly work for this metric (e.g. a PDF
    // export without the expected pattern fills) — fall back to guessing
    // every bucket's assignment from the mini-table anchors instead of
    // trusting a partial color result.
    const buckets: [number, number][] = bucketItems.map((its) => {
      if (its.length === 1) return [Number(its[0].str), Number(its[0].str)];
      return [Number(its[0].str), Number(its[1].str)];
    });
    const firstHalfWeights = [15, 15, 15 + firstHalfAdded];
    const secondHalfWeights = [15, 15, 15 + secondHalfAdded];
    const swap = bestBucketAssignment(
      buckets,
      firstHalfWeights,
      secondHalfWeights,
      homeTriple.firstHalf,
      awayTriple.firstHalf,
      homeTriple.secondHalf,
      awayTriple.secondHalf,
      homeTriple.total,
      awayTriple.total
    );
    return {
      home: { ...homeTriple, buckets: buckets.map(([a, b], i) => (swap[i] ? b : a)) },
      away: { ...awayTriple, buckets: buckets.map(([a, b], i) => (swap[i] ? a : b)) },
    };
  }

  return {
    home: { ...homeTriple, buckets: homeBuckets },
    away: { ...awayTriple, buckets: awayBuckets },
  };
}

export function parseTimeSegments(
  items: TextItem[],
  pageWidth: number,
  homeTeam: string,
  awayTeam: string,
  firstHalfAdded: number,
  secondHalfAdded: number,
  colorFills: ColorFill[]
): TimeSegmentsResult | null {
  const headerItems = items.filter((it) => METRIC_HEADERS.includes(it.str));
  if (headerItems.length === 0) return null;

  const headerRows = groupRows(headerItems, 5); // top-to-bottom, each row left-to-right
  const home: TimeSegmentMetric[] = [];
  const away: TimeSegmentMetric[] = [];

  headerRows.forEach((row, rowIdx) => {
    const rowBottomY = rowIdx + 1 < headerRows.length ? headerRows[rowIdx + 1][0].y : LAST_ROW_FLOOR_Y;
    const xBounds = [...row.map((h) => h.x), pageWidth + 1];

    row.forEach((header, colIdx) => {
      const xMin = xBounds[colIdx];
      const xMax = xBounds[colIdx + 1];
      const blockItems = items.filter((it) => it.x >= xMin && it.x < xMax && it.y < header.y - 1 && it.y >= rowBottomY);
      const parsed = parseMetricBlock(blockItems, homeTeam, awayTeam, firstHalfAdded, secondHalfAdded, colorFills);
      home.push({ metric: slug(header.str), label: header.str, ...parsed.home });
      away.push({ metric: slug(header.str), label: header.str, ...parsed.away });
    });
  });

  return { home, away };
}
