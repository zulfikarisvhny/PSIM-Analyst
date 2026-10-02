// components/players/PlayerRadarChart.tsx
"use client";
import { useTheme } from "next-themes";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import type { ComputedGroup } from "@/lib/scouting/psimPlayerMetrics";

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

export function PlayerRadarChart({ groups, playerName }: { groups: ComputedGroup[]; playerName: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridNeutral = isDark ? "#9a9a9f" : "#6b7280";
  const playerColor = isDark ? "#3987e5" : "#2a78d6";
  const poolLabel = "Position pool average";

  const axes = groups.flatMap((g) => g.items);
  if (axes.length === 0) return null;

  const data = axes.map((item) => ({
    axis: item.label,
    [playerName]: item.percentile,
    [poolLabel]: 50,
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} outerRadius={130} cy="48%">
        <PolarGrid stroke={isDark ? "#2a2b30" : "#e5e7eb"} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: gridNeutral, fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name={poolLabel} dataKey={poolLabel} stroke={gridNeutral} strokeDasharray="4 4" fill="none" fillOpacity={0} />
        <Radar name={playerName} dataKey={playerName} stroke={playerColor} fill={playerColor} fillOpacity={0.25} />
        <Legend
          content={() => (
            <div className="flex items-center justify-center gap-5 mt-2 text-xs">
              <LegendItem color={gridNeutral} label={`${poolLabel} (50th percentile)`} dashed />
              <LegendItem color={playerColor} label={playerName} />
            </div>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
