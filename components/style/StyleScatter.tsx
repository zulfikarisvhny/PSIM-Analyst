// components/style/StyleScatter.tsx
"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import type { TeamStyleRow } from "@/lib/scouting/psimStyleStats";
import { STYLE_METRICS, metricValue, type StyleMetricKey } from "@/lib/scouting/teamStyleMetrics";

const PSIM = "PSIM Yogyakarta";

function fmt(v: number, decimals: number, suffix?: string) {
  return `${v.toFixed(decimals)}${suffix ?? ""}`;
}

export function StyleScatter({ rows }: { rows: TeamStyleRow[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridNeutral = isDark ? "#9a9a9f" : "#6b7280";
  const refLineNeutral = isDark ? "#5c5d63" : "#9ca3af";
  const unfocusedStroke = isDark ? "#2a2b30" : "#d1d5db";
  const noLogoFill = isDark ? "#5c5d63" : "#9ca3af";
  const logoBackingFill = isDark ? "#14151a" : "#f3f4f6";
  const tooltipBg = isDark ? "#191a1d" : "#ffffff";
  const tooltipBorder = isDark ? "#2a2b30" : "#e5e7eb";

  const [xKey, setXKey] = useState<StyleMetricKey>("possessionPct");
  const [yKey, setYKey] = useState<StyleMetricKey>("proactiveDefPct");

  const xMeta = STYLE_METRICS.find((m) => m.key === xKey)!;
  const yMeta = STYLE_METRICS.find((m) => m.key === yKey)!;

  const points = rows
    .map((r) => ({
      clubName: r.clubName,
      logoUrl: r.logoUrl,
      x: metricValue(r, xKey),
      y: metricValue(r, yKey),
    }))
    .filter((p): p is { clubName: string; logoUrl: string | null; x: number; y: number } => p.x !== null && p.y !== null)
    // PSIM painted last so its marker sits on top when it overlaps a neighbor.
    .sort((a, b) => (a.clubName === PSIM ? 1 : 0) - (b.clubName === PSIM ? 1 : 0));

  const avgX = points.length ? points.reduce((a, p) => a + p.x, 0) / points.length : null;
  const avgY = points.length ? points.reduce((a, p) => a + p.y, 0) / points.length : null;

  const xVals = points.map((p) => p.x);
  const yVals = points.map((p) => p.y);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
  const xPad = (xMax - xMin) * 0.12 || Math.abs(xMax) * 0.1 || 1;
  const yPad = (yMax - yMin) * 0.15 || Math.abs(yMax) * 0.1 || 1;

  function TeamDot(props: any) {
    const { cx, cy, payload } = props;
    const isFocus = payload.clubName === PSIM;
    const size = isFocus ? 30 : 22;
    const r = size / 2;
    const stroke = isFocus ? (isDark ? "#ffcf4d" : "#3E63B4") : unfocusedStroke;
    const strokeWidth = isFocus ? 2.5 : 1.5;

    if (!payload.logoUrl) {
      return <circle cx={cx} cy={cy} r={r} fill={noLogoFill} stroke={stroke} strokeWidth={strokeWidth} />;
    }

    const clipId = `style-clip-${payload.clubName.replace(/[^a-zA-Z0-9]/g, "")}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r + 1.5} fill={logoBackingFill} stroke={stroke} strokeWidth={strokeWidth} />
        <image xlinkHref={payload.logoUrl} x={cx - r} y={cy - r} width={size} height={size} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
      </g>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/scatter-plot.png" alt="" className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">League Style Map</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            <span className="text-gray-500 dark:text-gray-400">X:</span>
            <select
              value={xKey}
              onChange={(e) => setXKey(e.target.value as StyleMetricKey)}
              className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1 text-gray-900 dark:text-white"
            >
              {STYLE_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-gray-500 dark:text-gray-400">Y:</span>
            <select
              value={yKey}
              onChange={(e) => setYKey(e.target.value as StyleMetricKey)}
              className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1 text-gray-900 dark:text-white"
            >
              {STYLE_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No data for this metric pair yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                name={xMeta.label}
                stroke={gridNeutral}
                domain={[xMin - xPad, xMax + xPad]}
                tick={{ fontSize: 10, fill: gridNeutral }}
                tickFormatter={(v) => fmt(v, xMeta.decimals, xMeta.suffix)}
                label={{ value: xMeta.label, position: "bottom", fill: gridNeutral, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yMeta.label}
                stroke={gridNeutral}
                domain={[yMin - yPad, yMax + yPad]}
                tick={{ fontSize: 10, fill: gridNeutral }}
                tickFormatter={(v) => fmt(v, yMeta.decimals, yMeta.suffix)}
                label={{ value: yMeta.label, angle: -90, position: "left", fill: gridNeutral, fontSize: 11 }}
              />
              <ZAxis range={[80, 80]} />
              {avgX !== null && (
                <ReferenceLine
                  x={avgX}
                  stroke={refLineNeutral}
                  strokeDasharray="4 4"
                  label={{ value: `Avg ${fmt(avgX, xMeta.decimals, xMeta.suffix)}`, position: "top", fill: refLineNeutral, fontSize: 10 }}
                />
              )}
              {avgY !== null && (
                <ReferenceLine
                  y={avgY}
                  stroke={refLineNeutral}
                  strokeDasharray="4 4"
                  label={{ value: `Avg ${fmt(avgY, yMeta.decimals, yMeta.suffix)}`, position: "right", fill: refLineNeutral, fontSize: 10 }}
                />
              )}
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as (typeof points)[number];
                  return (
                    <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, padding: 10, borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.clubName}</div>
                      <div>
                        {xMeta.label}: <b>{fmt(p.x, xMeta.decimals, xMeta.suffix)}</b>
                      </div>
                      <div>
                        {yMeta.label}: <b>{fmt(p.y, yMeta.decimals, yMeta.suffix)}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={points} shape={TeamDot} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Dashed lines mark the league average. Club crests are the markers — PSIM is ringed in blue.</p>
        </>
      )}
    </div>
  );
}
