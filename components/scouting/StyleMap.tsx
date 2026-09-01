// components/scouting/StyleMap.tsx
"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { LeagueTeamRow } from "@/lib/scouting/types";

type MetricId =
  | "poss" | "possNeutral" | "direct" | "territory" | "passAcc"
  | "xgPerShot" | "kpPerShot" | "proactiveDef" | "stepOut" | "aerialTendency"
  | "aerialWinRate" | "defActionsPerOppShot"
  | "foulsCommitted" | "duelsPerMatch";

type Trait = { high: string; low: string };

const METRICS: Record<MetricId, { label: string; unit: string; info: string; get: (r: LeagueTeamRow) => number }> = {
  poss: {
    label: "Possession", unit: "%",
    info: "Percentage of total passes made by the team out of both teams' combined passes. Higher = greater control of possession.",
    get: (r) => r["Poss %"],
  },
  possNeutral: {
    label: "Possession (Neutral)", unit: "%",
    info: "A neutral version of possession %, removing scoreline bias (teams that are ahead tend to slow the tempo).",
    get: (r) => r["Poss % (Neutral)"],
  },
  direct: {
    label: "Direct", unit: "%",
    info: "Share of long passes out of total passes. High = the team frequently bypasses midfield and goes long.",
    get: (r) => r["Direct %"],
  },
  territory: {
    label: "Territory", unit: "%",
    info: "Percentage of passes made in the opposition half. Shows how high up the pitch the team plays when in possession.",
    get: (r) => r["Territory %"],
  },
  passAcc: {
    label: "Pass Accuracy", unit: "%",
    info: "Successful passes divided by total passes. An indicator of technical build-up quality.",
    get: (r) => r["Pass Acc %"],
  },
  xgPerShot: {
    label: "xG per Shot", unit: "",
    info: "Expected goals per shot. High = high-quality chances created, not just shot volume.",
    get: (r) => r["xG/Shot"],
  },
  kpPerShot: {
    label: "Key Passes per Shot", unit: "",
    info: "Number of key passes per shot attempt. High = clean attacking build-up before shooting.",
    get: (r) => r["KP/Shot"],
  },
  proactiveDef: {
    label: "Proactive Defense", unit: "%",
    info: "Ratio of interceptions to total interceptions + ball recoveries. High = the team actively cuts out the opponent's play rather than just picking up loose balls.",
    get: (r) => r["Proactive Def %"],
  },
  stepOut: {
    label: "Step-Out", unit: "%",
    info: "Ratio of tackles to total tackles + clearances. High = players often step out of the defensive block to win the ball directly, rather than just clearing it.",
    get: (r) => r["Step-Out %"],
  },
  aerialTendency: {
    label: "Aerial Tendency", unit: "%",
    info: "Aerial duels as a percentage of total duels (aerial + ground). A proxy for the team's physical style of play.",
    get: (r) => r["Aerial %"],
  },
  aerialWinRate: {
    label: "Aerial Win Rate", unit: "%",
    info: "How effectively the team wins the aerial duels it contests (aerial_duels_won / total aerial duels).",
    get: (r) => (r.aerial_duels_won / (r.aerial_duels_won + r.aerial_duels_lost)) * 100,
  },
  defActionsPerOppShot: {
    label: "Def. Actions / Opp Shot", unit: "",
    info: "Defensive work rate (tackles + interceptions + clearances + blocks) relative to the shot threat faced.",
    get: (r) => (r.tackles + r.interceptions + r.clearances + r.blocked_shots) / r.opp_shots,
  },
  foulsCommitted: {
    label: "Fouls Committed / Match", unit: "",
    info: "Average fouls committed by the team per match. High = a rougher style of play / higher card risk.",
    get: (r) => r.fouls_committed / r.MP,
  },
  duelsPerMatch: {
    label: "Defensive Duels / Match", unit: "",
    info: "Average total duels (tackles + 1v1 duels, won or lost) contested by the team per match. A proxy for how often the team engages in physical contact/defensive duels.",
    get: (r) => (r.duels_won + r.duels_lost) / r.MP,
  },
};

const PRESETS: {
  id: string;
  label: string;
  x: MetricId;
  y: MetricId;
  xTrait: Trait;
  yTrait: Trait;
}[] = [
  {
    id: "attack-style",
    label: "Attacking Style: Direct Play vs Possession",
    x: "poss",
    y: "direct",
    xTrait: { high: "relies heavily on possession (a possession-based side)", low: "sees little of the ball" },
    yTrait: { high: "plays direct / pragmatic football (long balls straight forward)", low: "prefers to build attacks patiently from the back" },
  },
  {
    id: "chance-quality",
    label: "Chance Quality: Clinical Edge vs Creativity",
    x: "xgPerShot",
    y: "kpPerShot",
    xTrait: { high: "creates high-quality chances (high xG/shot)", low: "creates less dangerous chances (low xG/shot)" },
    yTrait: { high: "is highly creative in building chances (high key passes/shot)", low: "shows little creativity in its attacking build-up" },
  },
  {
    id: "territory",
    label: "Territorial Control: Possession vs Territory",
    x: "poss",
    y: "territory",
    xTrait: { high: "relies heavily on possession (a possession-based side)", low: "sees little of the ball" },
    yTrait: { high: "dominates territory in the opposition's defensive third (high territory)", low: "spends more time in its own half" },
  },
  {
    id: "pressing",
    label: "Pressing Intensity: Proactive Defense vs Step-Out",
    x: "proactiveDef",
    y: "stepOut",
    xTrait: { high: "defends very proactively (high pressing intensity)", low: "tends to sit back and wait (low block)" },
    yTrait: { high: "frequently steps out of the defensive line to break up attacks", low: "rarely steps out, preferring to hold its defensive shape" },
  },
  {
    id: "passing-directness",
    label: "Passing Accuracy vs Direct Play",
    x: "passAcc",
    y: "direct",
    xTrait: { high: "has high passing accuracy (clean build-up play)", low: "has low passing accuracy, prone to losing the ball" },
    yTrait: { high: "plays direct / pragmatic football", low: "is more patient in its build-up play" },
  },
  {
    id: "physical-pressing",
    label: "Physicality & Aerial Duels vs Pressing",
    x: "aerialTendency",
    y: "proactiveDef",
    xTrait: { high: "frequently contests aerial duels (a physical style of play)", low: "rarely contests aerial duels" },
    yTrait: { high: "presses intensely / defends proactively", low: "tends to defend passively" },
  },
  {
    id: "aerial-defense",
    label: "Aerial Duels & Defensive Work Rate",
    x: "aerialWinRate",
    y: "defActionsPerOppShot",
    xTrait: { high: "is effective at winning aerial duels", low: "struggles to win aerial duels" },
    yTrait: { high: "works extremely hard defensively relative to the threat it faces", low: "has a relatively light defensive workload compared to the threat it faces" },
  },
  {
    id: "discipline",
    label: "Duel Intensity vs Discipline",
    x: "duelsPerMatch",
    y: "foulsCommitted",
    xTrait: { high: "contests defensive duels (tackles & 1v1s) very frequently every match", low: "rarely contests defensive duels" },
    yTrait: { high: "commits fouls frequently (higher card risk)", low: "is relatively disciplined, rarely fouling" },
  },
];

function fmt(v: number, unit: string) {
  if (unit === "x") return `${v.toFixed(2)}x`;
  return unit === "%" ? `${v.toFixed(1)}%` : v.toFixed(2);
}

export function StyleMap({
  rows,
  focusTeam,
  compareTeam,
}: {
  rows: LeagueTeamRow[];
  focusTeam: string; // e.g. "Bhayangkara Presisi FC"
  compareTeam?: string; // e.g. "PSIM Yogyakarta"
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  // Chart neutrals: on the dark card, these blend in low-contrast on purpose;
  // on a white card the same hex values would read as harsh near-black, so
  // they get lighter counterparts for light mode.
  const gridNeutral = isDark ? "#9a9a9f" : "#6b7280";
  const refLineNeutral = isDark ? "#5c5d63" : "#9ca3af";
  const unfocusedStroke = isDark ? "#2a2b30" : "#d1d5db";
  const noLogoFill = isDark ? "#5c5d63" : "#9ca3af";
  const logoBackingFill = isDark ? "#14151a" : "#f3f4f6";
  const tooltipBg = isDark ? "#191a1d" : "#ffffff";
  const tooltipBorder = isDark ? "#2a2b30" : "#e5e7eb";

  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const xMeta = METRICS[preset.x];
  const yMeta = METRICS[preset.y];

  // Recharts paints Scatter points in data-array order (later = higher
  // z-index), so the focus/compare teams are sorted to the end here to keep
  // their dot on top when it overlaps a neighbor — reordering only changes
  // paint order, not each point's plotted x/y.
  const data = rows
    .map((r) => ({
      team: r.Team,
      logoUrl: r.logo_url,
      x: xMeta.get(r),
      y: yMeta.get(r),
    }))
    .sort((a, b) => {
      const rank = (t: string) => (t === focusTeam ? 2 : t === compareTeam ? 1 : 0);
      return rank(a.team) - rank(b.team);
    });

  const avgX = data.reduce((s, d) => s + d.x, 0) / data.length;
  const avgY = data.reduce((s, d) => s + d.y, 0) / data.length;

  const xVals = data.map((d) => d.x);
  const yVals = data.map((d) => d.y);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
  const xPad = (xMax - xMin) * 0.1 || Math.abs(xMax) * 0.1 || 1;
  const yPad = (yMax - yMin) * 0.15 || Math.abs(yMax) * 0.15 || 1;

  const focusPoint = data.find((d) => d.team === focusTeam);

  function TeamDot(props: any) {
    const { cx, cy, payload } = props;
    const isFocus = payload.team === focusTeam;
    const isCompare = payload.team === compareTeam;
    const size = isFocus ? 30 : isCompare ? 28 : 20;
    const r = size / 2;
    const stroke = isFocus ? (isDark ? "#ffcf4d" : "#2563eb") : isCompare ? "#4f8fe0" : unfocusedStroke;
    const strokeWidth = isFocus || isCompare ? 2.5 : 1.5;

    if (!payload.logoUrl) {
      return <circle cx={cx} cy={cy} r={r} fill={noLogoFill} stroke={stroke} strokeWidth={strokeWidth} />;
    }

    const clipId = `clip-${payload.team.replace(/[^a-zA-Z0-9]/g, "")}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r + 1.5} fill={logoBackingFill} stroke={stroke} strokeWidth={strokeWidth} />
        <image
          xlinkHref={payload.logoUrl}
          x={cx - r} y={cy - r} width={size} height={size}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Analysis</label>
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white w-full max-w-md"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 30, right: 30, bottom: 30, left: 10 }}>
          <XAxis
            type="number" dataKey="x" name={xMeta.label} stroke={gridNeutral}
            domain={[xMin - xPad, xMax + xPad]}
            tick={{ fontSize: 10, fill: gridNeutral }}
            tickFormatter={(v) => fmt(v, xMeta.unit)}
            label={{ value: xMeta.label, position: "bottom", fill: gridNeutral }}
          />
          <YAxis
            type="number" dataKey="y" name={yMeta.label} stroke={gridNeutral}
            domain={[yMin - yPad, yMax + yPad]}
            tick={{ fontSize: 10, fill: gridNeutral }}
            tickFormatter={(v) => fmt(v, yMeta.unit)}
            label={{ value: yMeta.label, angle: -90, position: "left", fill: gridNeutral }}
          />
          <ZAxis range={[80, 80]} />
          <ReferenceLine x={avgX} stroke={refLineNeutral} strokeDasharray="4 4" />
          <ReferenceLine y={avgY} stroke={refLineNeutral} strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, padding: 10, borderRadius: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.team}</div>
                  <div style={{ marginTop: 4 }}>{xMeta.label}: <b>{fmt(d.x, xMeta.unit)}</b></div>
                  <div>{yMeta.label}: <b>{fmt(d.y, yMeta.unit)}</b></div>
                </div>
              );
            }}
          />
          <Scatter data={data} shape={TeamDot} />
        </ScatterChart>
      </ResponsiveContainer>

      {focusPoint && (
        <div className="mt-4 bg-gray-100 dark:bg-[#202126] rounded-lg p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <b className="text-gray-900 dark:text-white">{focusTeam}</b> {preset.xTrait[focusPoint.x >= avgX ? "high" : "low"]}{" "}
          ({xMeta.label} {fmt(focusPoint.x, xMeta.unit)} vs league average {fmt(avgX, xMeta.unit)}),
          and {preset.yTrait[focusPoint.y >= avgY ? "high" : "low"]}{" "}
          ({yMeta.label} {fmt(focusPoint.y, yMeta.unit)} vs league average {fmt(avgY, yMeta.unit)}).
        </div>
      )}

      <details className="mt-4 bg-white dark:bg-[#191a1d] rounded-lg border border-gray-200 dark:border-[#2a2b30]">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-teal-600 dark:text-[#7dd3c0]">
          Metric Glossary
        </summary>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {(Object.keys(METRICS) as MetricId[]).map((key) => (
            <div key={key}>
              <b className="text-gray-900 dark:text-white">{METRICS[key].label}</b> — {METRICS[key].info}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
