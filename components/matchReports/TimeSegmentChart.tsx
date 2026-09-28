// components/matchReports/TimeSegmentChart.tsx
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

interface TimeSegmentRow {
  segment: string;
  possessionPct: number | null;
  passAccuracyPct: number | null;
  longPassSharePct: number | null;
  duelsWinPct: number | null;
  attacksPerMin: number | null;
  recoveriesPerMin: number | null;
  avgFormationLineM: number | null;
  ppda: number | null;
}

interface GoalEntry {
  minute: string;
}

type MetricKey = Exclude<keyof TimeSegmentRow, "segment">;

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
}

// Grouped into the three phases of play this club cares about, rather than a
// flat list of all 8 parsed metrics — picked with the user: Attack output,
// Transition (regaining the ball / contesting it), and Defensive shape.
const CATEGORIES: { title: string; metrics: MetricDef[] }[] = [
  {
    title: "Attack",
    metrics: [
      { key: "attacksPerMin", label: "Attacks / min", unit: "" },
      { key: "possessionPct", label: "Possession", unit: "%" },
    ],
  },
  {
    title: "Transition",
    metrics: [
      { key: "recoveriesPerMin", label: "Recoveries / min", unit: "" },
      { key: "duelsWinPct", label: "Duels Win Rate", unit: "%" },
    ],
  },
  {
    title: "Defense",
    metrics: [
      { key: "avgFormationLineM", label: "Formation Line", unit: "m" },
      { key: "ppda", label: "PPDA", unit: "" },
    ],
  },
];

const HOME_COLOR = "#2563eb";
const AWAY_COLOR = "#f97316"; // matches this browser's existing home/away bar convention

// Each 15-min bucket plotted at its midpoint on a real minute scale (0-96, to
// leave room for stoppage time), so a goal's ReferenceLine can be placed at
// its *actual* minute instead of snapping to a bucket's tick.
const SEGMENT_MIDPOINTS: { segment: string; x: number }[] = [
  { segment: "0-15", x: 7.5 },
  { segment: "16-30", x: 23 },
  { segment: "31-45+", x: 38 },
  { segment: "46-60", x: 53 },
  { segment: "61-75", x: 68 },
  { segment: "76-90+", x: 83 },
];
const SEGMENT_LABEL_BY_X = new Map(SEGMENT_MIDPOINTS.map((s) => [s.x, s.segment]));

/** "45+2" -> 47 — treats stoppage time as extending the raw minute, for chart x-positioning only. */
function minuteToX(minute: string): number {
  const m = minute.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) : 0);
}

function segmentForMinute(minute: string): string {
  const whole = parseInt(minute, 10);
  if (whole <= 15) return "0-15";
  if (whole <= 30) return "16-30";
  if (whole <= 45) return "31-45+";
  if (whole <= 60) return "46-60";
  if (whole <= 75) return "61-75";
  return "76-90+";
}

function avgMetric(rows: TimeSegmentRow[], key: MetricKey): number | null {
  const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function fmtNum(v: number | null, decimals: number, unit: string): string {
  return v === null ? "—" : `${v.toFixed(decimals)}${unit}`;
}

function highLow(rows: TimeSegmentRow[], key: MetricKey): { peakSeg: string; peakVal: number; dipSeg: string; dipVal: number } | null {
  const withVals = rows.map((r) => ({ segment: r.segment, val: r[key] })).filter((r): r is { segment: string; val: number } => typeof r.val === "number");
  if (withVals.length < 2) return null;
  const peak = withVals.reduce((a, b) => (b.val > a.val ? b : a));
  const dip = withVals.reduce((a, b) => (b.val < a.val ? b : a));
  if (peak.segment === dip.segment) return null;
  return { peakSeg: peak.segment, peakVal: peak.val, dipSeg: dip.segment, dipVal: dip.val };
}

function nextSegmentValue(rows: TimeSegmentRow[], seg: string, key: MetricKey): { cur: number | null; next: number | null; nextSeg: string | null } {
  const idx = SEGMENT_MIDPOINTS.findIndex((s) => s.segment === seg);
  const cur = rows.find((r) => r.segment === seg)?.[key] ?? null;
  if (idx < 0 || idx >= SEGMENT_MIDPOINTS.length - 1) return { cur, next: null, nextSeg: null };
  const nextSeg = SEGMENT_MIDPOINTS[idx + 1].segment;
  const next = rows.find((r) => r.segment === nextSeg)?.[key] ?? null;
  return { cur, next, nextSeg };
}

const CONNECTORS = ["Then", "Shortly after", "Following that", "Interestingly"];

/** A short flowing story about PSIM's attack across the match — output, comparison to the opponent, the high/low point, and what happened right after each goal (scored or conceded). */
function attackStory(psim: TimeSegmentRow[], opp: TimeSegmentRow[], psimGoals: GoalEntry[], concededGoals: GoalEntry[]): string {
  const pAtk = avgMetric(psim, "attacksPerMin"),
    oAtk = avgMetric(opp, "attacksPerMin");
  const pPos = avgMetric(psim, "possessionPct"),
    oPos = avgMetric(opp, "possessionPct");
  const atkAvg = pAtk;

  let story = `PSIM averaged ${fmtNum(pAtk, 2, "")} attacks/min and ${fmtNum(pPos, 0, "%")} possession across the match`;
  if (pAtk !== null && oAtk !== null) {
    story +=
      pAtk > oAtk
        ? `, more than the opponent's ${fmtNum(oAtk, 2, "")}/min`
        : pAtk < oAtk
        ? `, less than the opponent's ${fmtNum(oAtk, 2, "")}/min`
        : `, matching the opponent's pace`;
  }
  story += ".";

  const hl = highLow(psim, "attacksPerMin");
  if (hl) {
    story += ` Their attacking output peaked in the ${hl.peakSeg} window (${fmtNum(hl.peakVal, 2, "")}/min), then dropped off in the ${hl.dipSeg} window (${fmtNum(
      hl.dipVal,
      2,
      ""
    )}/min).`;
  }

  const moments = [
    ...psimGoals.map((g) => ({ minute: g.minute, kind: "scored" as const })),
    ...concededGoals.map((g) => ({ minute: g.minute, kind: "conceded" as const })),
  ].sort((a, b) => minuteToX(a.minute) - minuteToX(b.minute));

  moments.forEach((m, i) => {
    const seg = segmentForMinute(m.minute);
    const connector = CONNECTORS[i % CONNECTORS.length];
    const { cur, next, nextSeg } = nextSegmentValue(psim, seg, "attacksPerMin");

    if (m.kind === "scored") {
      const prefix = i === 0 ? "After" : `${connector}, after`;
      if (cur !== null && next !== null && nextSeg) {
        const trend = next > cur ? "kept pushing forward at the same intensity" : next < cur ? "eased off and slowed the tempo" : "kept attacking at the same tempo";
        story += ` ${prefix} PSIM scored in the ${m.minute}' minute, over the next 15 minutes they ${trend}.`;
      } else {
        story += ` ${i === 0 ? "PSIM" : `${connector}, PSIM`} scored in the ${m.minute}' minute.`;
      }
    } else {
      let context = "";
      if (cur !== null && atkAvg !== null && Math.abs(cur - atkAvg) >= 0.1) {
        context = cur > atkAvg ? " — PSIM were actually pushing hard forward at that moment, possibly exposed on the counter" : " — PSIM's attack had slowed down at that point";
      }
      const prefix = i === 0 ? "PSIM" : `${connector}, PSIM`;
      story += ` ${prefix} conceded in the ${m.minute}' minute${context}.`;
      if (cur !== null && next !== null && nextSeg) {
        const trend = next > cur ? "responded by attacking even harder" : next < cur ? "instead faded further and attacked less" : "kept attacking at the same tempo";
        story += ` They ${trend} over the next 15 minutes.`;
      }
    }
  });

  return story;
}

/** A short flowing story about PSIM's transition play — recoveries/duels, the busiest/quietest moment, and how quickly they won the ball back right after conceding. */
function transitionStory(psim: TimeSegmentRow[], opp: TimeSegmentRow[], concededGoals: GoalEntry[]): string {
  const pRec = avgMetric(psim, "recoveriesPerMin"),
    oRec = avgMetric(opp, "recoveriesPerMin");
  const pDuel = avgMetric(psim, "duelsWinPct"),
    oDuel = avgMetric(opp, "duelsWinPct");

  let story = `PSIM averaged ${fmtNum(pRec, 2, "")} recoveries/min and won ${fmtNum(pDuel, 0, "%")} of duels across the match`;
  if (pRec !== null && oRec !== null) {
    story +=
      pRec > oRec
        ? `, faster than the opponent (${fmtNum(oRec, 2, "")}/min)`
        : pRec < oRec
        ? `, slower than the opponent (${fmtNum(oRec, 2, "")}/min)`
        : `, matching the opponent's pace (${fmtNum(oRec, 2, "")}/min)`;
  }
  story += ".";

  const hl = highLow(psim, "recoveriesPerMin");
  if (hl) {
    story += ` They won the ball back most often in the ${hl.peakSeg} window, and least often in ${hl.dipSeg}.`;
  }

  concededGoals.forEach((g, i) => {
    const seg = segmentForMinute(g.minute);
    const { cur, next, nextSeg } = nextSegmentValue(psim, seg, "recoveriesPerMin");
    if (cur === null || next === null || !nextSeg) return;
    const conn = i === 0 ? "After" : `${CONNECTORS[i % CONNECTORS.length]}, after`;
    const trend = next > cur ? "won the ball back even more often" : next < cur ? "instead won it back even less often" : "won it back at the same rate";
    story += ` ${conn} conceding in the ${g.minute}' minute, PSIM ${trend} over the next 15 minutes (${nextSeg}).`;
  });

  return story;
}

/** A short flowing story about PSIM's defensive shape — line height + pressing, where it was highest/loosest, and what their defense looked like at the exact moment(s) they conceded. */
function defenseStory(psim: TimeSegmentRow[], opp: TimeSegmentRow[], concededGoals: GoalEntry[]): string {
  const pLine = avgMetric(psim, "avgFormationLineM"),
    oLine = avgMetric(opp, "avgFormationLineM");
  const pPpda = avgMetric(psim, "ppda"),
    oPpda = avgMetric(opp, "ppda");

  let story = `PSIM's defensive line averaged ${fmtNum(pLine, 1, "m")} with a pressing intensity (PPDA) of ${fmtNum(pPpda, 1, "")} across the match`;
  if (pLine !== null && oLine !== null) {
    story +=
      pLine > oLine
        ? `, higher up the pitch than the opponent's (${fmtNum(oLine, 1, "m")})`
        : pLine < oLine
        ? `, deeper than the opponent's (${fmtNum(oLine, 1, "m")})`
        : `, matching the opponent's line height`;
  }
  if (pPpda !== null && oPpda !== null) {
    story +=
      pPpda < oPpda
        ? `, and pressed tighter than the opponent (PPDA ${fmtNum(oPpda, 1, "")})`
        : pPpda > oPpda
        ? `, and pressed looser than the opponent (PPDA ${fmtNum(oPpda, 1, "")})`
        : `, with the same pressing intensity as the opponent`;
  }
  story += ".";

  const hlLine = highLow(psim, "avgFormationLineM");
  if (hlLine) story += ` Their line pushed highest in the ${hlLine.peakSeg} window, and sat deepest in ${hlLine.dipSeg}.`;

  const ppdaVals = psim.map((r) => ({ segment: r.segment, val: r.ppda })).filter((r): r is { segment: string; val: number } => typeof r.val === "number");
  if (ppdaVals.length >= 2) {
    const tightest = ppdaVals.reduce((a, b) => (b.val < a.val ? b : a));
    const loosest = ppdaVals.reduce((a, b) => (b.val > a.val ? b : a));
    if (tightest.segment !== loosest.segment) {
      story += ` Their press was tightest in the ${tightest.segment} window, and loosest in ${loosest.segment}.`;
    }
  }

  const lineAvg = pLine;
  const ppdaAvg = pPpda;
  concededGoals.forEach((g, i) => {
    const seg = segmentForMinute(g.minute);
    const row = psim.find((r) => r.segment === seg);
    if (!row) return;
    const bits: string[] = [];
    if (row.avgFormationLineM !== null && lineAvg !== null && Math.abs(row.avgFormationLineM - lineAvg) >= 2) {
      bits.push(row.avgFormationLineM > lineAvg ? "their line had pushed up high" : "their line had dropped deep");
    }
    if (row.ppda !== null && ppdaAvg !== null && Math.abs(row.ppda - ppdaAvg) >= 2) {
      bits.push(row.ppda > ppdaAvg ? "their press had loosened, letting the opponent move the ball more freely" : "their press was tighter than usual");
    }
    const conn = i === 0 ? "At the moment of" : `${CONNECTORS[i % CONNECTORS.length]}, at the moment of`;
    if (bits.length > 0) {
      story += ` ${conn} conceding in the ${g.minute}' minute, ${bits.join(" and ")}.`;
    } else {
      story += ` ${conn} conceding in the ${g.minute}' minute, their defensive shape was roughly in line with their match average.`;
    }
    const { cur, next, nextSeg } = nextSegmentValue(psim, seg, "ppda");
    if (cur !== null && next !== null && nextSeg) {
      const trend = next < cur ? "pressed even tighter" : next > cur ? "instead pressed even looser" : "pressed at the same intensity";
      story += ` Afterwards, in the ${nextSeg} window they ${trend}.`;
    }
  });

  return story;
}

export function TimeSegmentChart({
  homeTeam,
  awayTeam,
  home,
  away,
  homeGoals = [],
  awayGoals = [],
}: {
  homeTeam: string;
  awayTeam: string;
  home: TimeSegmentRow[];
  away: TimeSegmentRow[];
  homeGoals?: GoalEntry[];
  awayGoals?: GoalEntry[];
}) {
  const homeGoalXs = homeGoals.map((g) => minuteToX(g.minute));
  const awayGoalXs = awayGoals.map((g) => minuteToX(g.minute));
  const psimIsHome = homeTeam.toUpperCase().includes("PSIM");
  const psimRows = psimIsHome ? home : away;
  const oppRows = psimIsHome ? away : home;
  const psimGoals = psimIsHome ? homeGoals : awayGoals;
  const concededGoals = psimIsHome ? awayGoals : homeGoals;

  const stories: Record<string, string> = {
    Attack: attackStory(psimRows, oppRows, psimGoals, concededGoals),
    Transition: transitionStory(psimRows, oppRows, concededGoals),
    Defense: defenseStory(psimRows, oppRows, concededGoals),
  };

  return (
    <div>
      <div className="flex items-center gap-4 text-[11px] mb-4">
        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: HOME_COLOR }} />
          {homeTeam}
        </span>
        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: AWAY_COLOR }} />
          {awayTeam}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.title}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{cat.title}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {cat.metrics.map((metric) => {
                const data = home.map((row, i) => {
                  const point = SEGMENT_MIDPOINTS.find((s) => s.segment === row.segment);
                  return {
                    x: point?.x ?? 0,
                    segment: row.segment,
                    home: row[metric.key],
                    away: away[i]?.[metric.key] ?? null,
                  };
                });
                return (
                  <div key={metric.key}>
                    <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1">{metric.label}</div>
                    <ResponsiveContainer width="100%" height={170}>
                      <LineChart data={data} margin={{ top: 18, right: 10, bottom: 0, left: -5 }}>
                        <CartesianGrid vertical={false} stroke="#eef1f6" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          domain={[0, 92]}
                          ticks={SEGMENT_MIDPOINTS.map((s) => s.x)}
                          tickFormatter={(v) => SEGMENT_LABEL_BY_X.get(v) ?? ""}
                          tick={{ fontSize: 9, fill: "#9aa3b2" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: "#9aa3b2" }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                          label={metric.unit ? { value: metric.unit, angle: -90, position: "insideLeft", fontSize: 9, fill: "#9aa3b2" } : undefined}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) => (payload && payload[0] ? (payload[0].payload as { segment: string }).segment : "")}
                          formatter={(v, name) => [v === null || v === undefined ? "—" : `${v}${metric.unit}`, name]}
                          contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        />
                        {homeGoalXs.map((x, i) => (
                          <ReferenceLine key={`hg-${i}`} x={x} stroke={HOME_COLOR} strokeDasharray="3 3" label={{ value: "⚽", position: "top", fontSize: 11 }} />
                        ))}
                        {awayGoalXs.map((x, i) => (
                          <ReferenceLine key={`ag-${i}`} x={x} stroke={AWAY_COLOR} strokeDasharray="3 3" label={{ value: "⚽", position: "top", fontSize: 11 }} />
                        ))}
                        <Line
                          type="linear"
                          dataKey="home"
                          name={homeTeam}
                          stroke={HOME_COLOR}
                          strokeWidth={2}
                          dot={{ r: 2.5 }}
                          connectNulls
                          label={{ fontSize: 9, fill: HOME_COLOR, position: "top" }}
                        />
                        <Line
                          type="linear"
                          dataKey="away"
                          name={awayTeam}
                          stroke={AWAY_COLOR}
                          strokeWidth={2}
                          dot={{ r: 2.5 }}
                          connectNulls
                          label={{ fontSize: 9, fill: AWAY_COLOR, position: "bottom" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">{stories[cat.title]}</p>
            {cat.title === "Defense" && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                Formation Line up = PSIM's defense sits higher, closer to the halfway line. Formation Line down = PSIM's defense sits deeper, closer to
                their own goal. Low PPDA = PSIM presses tighter (the opponent is closed down as soon as they get the ball). High PPDA = PSIM presses
                looser (the opponent gets more time and space on the ball).
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
