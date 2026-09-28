// components/style/PointsProgressionChart.tsx
"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { PointsProgressionPoint, MatchResult } from "@/lib/scouting/pointsProgression";

const RESULT_COLOR: Record<MatchResult["result"], string> = { W: "#10b981", D: "#9ca3af", L: "#ef4444" };
const CURRENT_COLOR = "#3E63B4";
const LAST_COLOR = "#EC6A3B";

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-xs font-semibold text-gray-600">{label}</span>
    </div>
  );
}

export function PointsProgressionChart({ data }: { data: PointsProgressionPoint[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-500">No match data available yet for either season.</p>;
  }

  const lastGameweek = data[data.length - 1].gameweek;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#121b2d]">Points Progression</h3>
        </div>
      </div>
      <div className="flex items-center gap-5 mb-4">
        <LegendDot color={CURRENT_COLOR} label="This Season (2026/2027)" />
        <LegendDot color={LAST_COLOR} label="Last Season (2025/2026)" />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="currentSeasonFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CURRENT_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CURRENT_COLOR} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="lastSeasonFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LAST_COLOR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={LAST_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef1f6" />
          <XAxis
            dataKey="gameweek"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tick={({ x, y, payload }) => {
              const isCurrent = payload.value === lastGameweek;
              return (
                <text x={x} y={Number(y) + 14} textAnchor="middle" fontSize={11} fontWeight={isCurrent ? 800 : 500} fill={isCurrent ? "#121b2d" : "#9aa3b2"}>
                  w{payload.value}
                </text>
              );
            }}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9aa3b2", fontSize: 11 }} width={30} />
          <Tooltip
            cursor={{ stroke: "#d1d9e6", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as PointsProgressionPoint;
              return (
                <div className="rounded-xl px-3.5 py-2.5 text-xs shadow-lg bg-[#121b2d] text-white">
                  <div className="font-bold mb-1">Gameweek {label}</div>
                  <MatchLineDark label="This Season" points={point.currentSeasonPoints} match={point.currentSeasonMatch} color={CURRENT_COLOR} />
                  <MatchLineDark label="Last Season" points={point.lastSeasonPoints} match={point.lastSeasonMatch} color={LAST_COLOR} />
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="lastSeasonPoints"
            stroke={LAST_COLOR}
            strokeWidth={2}
            fill="url(#lastSeasonFill)"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="currentSeasonPoints"
            stroke={CURRENT_COLOR}
            strokeWidth={3}
            fill="url(#currentSeasonFill)"
            dot={{ r: 3, fill: CURRENT_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MatchLineDark({ label, points, match, color }: { label: string; points: number | null; match: MatchResult | null; color: string }) {
  if (points === null) return null;
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="font-semibold">{label}:</span>
        <span className="text-white/80">{points} pts</span>
      </div>
      {match && (
        <div className="flex items-center gap-1.5 mt-0.5 pl-3.5">
          <span
            className="w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold text-white shrink-0"
            style={{ background: RESULT_COLOR[match.result] }}
          >
            {match.result}
          </span>
          <span className="text-white/70">
            {match.home ? "vs" : "@"} {match.opponent} ({match.goalsFor}–{match.goalsAgainst})
          </span>
        </div>
      )}
    </div>
  );
}
