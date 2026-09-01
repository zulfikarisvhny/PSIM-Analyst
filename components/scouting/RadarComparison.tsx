// components/scouting/RadarComparison.tsx
"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend,
} from "recharts";
import { LeagueTeamRow, RadarPercentiles, RADAR_AXES, RADAR_LABELS } from "@/lib/scouting/types";

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {dashed ? (
        <span className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: color }} />
      ) : (
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      )}
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
    </div>
  );
}

export function RadarComparison({
  rows,
  percentiles,
  focusTeam,
  teamOptions,
}: {
  rows: LeagueTeamRow[];
  percentiles: Record<string, RadarPercentiles>;
  focusTeam: string; // e.g. "Bhayangkara Presisi FC"
  teamOptions: string[]; // all other team names
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridNeutral = isDark ? "#9a9a9f" : "#6b7280";

  const [compareTeam, setCompareTeam] = useState(
    teamOptions.find((t) => t.includes("PSIM")) ?? teamOptions[0]
  );

  const focusRow = rows.find((r) => r.Team === focusTeam);
  const compareRow = rows.find((r) => r.Team === compareTeam);

  const allTeams = Object.values(percentiles);
  const leagueAvg: Record<string, number> = {};
  for (const axis of RADAR_AXES) {
    leagueAvg[axis] = allTeams.reduce((s, p) => s + p[axis], 0) / allTeams.length;
  }

  const data = RADAR_AXES.map((axis) => ({
    axis: RADAR_LABELS[axis],
    [focusTeam]: percentiles[focusTeam]?.[axis] ?? 0,
    [compareTeam]: percentiles[compareTeam]?.[axis] ?? 0,
    "League Average": leagueAvg[axis],
  }));

  const diffs = RADAR_AXES.map((axis) => {
    const focusVal = percentiles[focusTeam]?.[axis] ?? 0;
    return { label: RADAR_LABELS[axis], focusVal, avgVal: leagueAvg[axis], diff: focusVal - leagueAvg[axis] };
  }).sort((a, b) => b.diff - a.diff);

  const [strongest, secondStrongest] = diffs;
  const weakest = diffs[diffs.length - 1];
  const secondWeakest = diffs[diffs.length - 2];

  return (
    <div>
      <div className="mb-5">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Compare with:</label>
        <select
          value={compareTeam}
          onChange={(e) => setCompareTeam(e.target.value)}
          className="bg-gray-100 dark:bg-[#26272c] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md p-2 text-sm w-72"
        >
          {teamOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-0 items-center">
        <div>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={data} outerRadius={120} cy="42%">
              <PolarGrid stroke={isDark ? "#2a2b30" : "#e5e7eb"} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: gridNeutral, fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="League Average"
                dataKey="League Average"
                stroke={gridNeutral}
                strokeDasharray="4 4"
                fill="none"
                fillOpacity={0}
              />
              <Radar
                name={focusTeam}
                dataKey={focusTeam}
                stroke="#ffcf4d"
                fill="#ffcf4d"
                fillOpacity={0.2}
              />
              <Radar
                name={compareTeam}
                dataKey={compareTeam}
                stroke="#4f8fe0"
                fill="#4f8fe0"
                fillOpacity={0.2}
              />
              <Legend
                content={() => (
                  <div className="flex items-center justify-center gap-5 mt-2 text-xs">
                    <LegendItem color={gridNeutral} label="League Average" dashed />
                    <LegendItem color="#ffcf4d" label={focusTeam} />
                    <LegendItem color="#4f8fe0" label={compareTeam} />
                  </div>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-100 dark:bg-[#202126] rounded-lg p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex flex-col gap-3 md:-ml-4">
          <p>
            <b className="text-gray-900 dark:text-white">{focusTeam}</b> is a{" "}
            <b>{focusRow?.Style ?? "—"}</b> side with a{" "}
            <b>{focusRow?.Defense ?? "—"}</b> defensive approach.
          </p>
          <p>
            Their key strengths are <b>{strongest.label}</b> (percentile{" "}
            {strongest.focusVal.toFixed(0)} vs league average {strongest.avgVal.toFixed(0)}) and{" "}
            <b>{secondStrongest.label}</b> (percentile {secondStrongest.focusVal.toFixed(0)} vs{" "}
            {secondStrongest.avgVal.toFixed(0)}) — well above the league average.
          </p>
          <p>
            Conversely, their weakest points are <b>{weakest.label}</b> (percentile{" "}
            {weakest.focusVal.toFixed(0)} vs league average {weakest.avgVal.toFixed(0)}) and{" "}
            <b>{secondWeakest.label}</b> (percentile {secondWeakest.focusVal.toFixed(0)} vs{" "}
            {secondWeakest.avgVal.toFixed(0)}) — areas that could be exploited by{" "}
            {compareTeam}.
          </p>
          {compareRow && (
            <p className="text-gray-500 dark:text-gray-400">
              By comparison, <b>{compareTeam}</b> play a{" "}
              <b>{compareRow.Style}</b> style with a <b>{compareRow.Defense}</b> defensive approach.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
