// components/scouting/DefenderRadar.tsx
"use client";
import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { PLAYER_PROFILE_FIELDS, PlayerProfileRow, NexusPlayerRow, percentileRank } from "@/lib/scouting/players";

const REGULAR_MINUTES = 300; // matches the league pool's own minutes threshold

type Axis = { key: keyof PlayerProfileRow; label: string };

// Same 4 groups as "Ringkasan Tim" above (Bek/Gelandang/Sayap/Penyerang), same
// accent colors — each with its own relevant actions, not a shared template.
const POSITION_GROUPS: { key: string; label: string; color: string; positions: string[]; axes: Axis[] }[] = [
  {
    key: "BACK",
    label: "Defenders",
    color: "#7dd3c0",
    positions: ["CB", "RB", "LB"],
    axes: [
      { key: "padj_interceptions", label: "PAdj Interceptions" },
      { key: "defensive_duels_quality", label: "Def Duels Quality" },
      { key: "aerial_quality", label: "Aerial Quality" },
      { key: "passes_quality", label: "Passes Quality" },
      { key: "long_passes_per90", label: "Long Passes/90" },
      { key: "defensive_activity", label: "Defensive Activity" },
    ],
  },
  {
    key: "MID",
    label: "Midfielders",
    color: "#f0a94d",
    positions: ["CM", "DM", "AM"],
    axes: [
      { key: "padj_interceptions", label: "PAdj Interceptions" },
      { key: "fouls_per90", label: "Fouls/90" },
      { key: "accurate_passes_pct", label: "Passing Accuracy %" },
      { key: "passes_quality", label: "Passing Quality" },
      { key: "defensive_duels_quality", label: "Def Duels Quality" },
      { key: "progressive_passes_quality", label: "Prog Passes Quality" },
      { key: "creativity_quality", label: "Creativity Quality" },
    ],
  },
  {
    key: "WING",
    label: "Wingers",
    color: "#b088f0",
    positions: ["RW", "LW"],
    axes: [
      { key: "finishing_efficiency", label: "Finishing Efficiency" },
      { key: "xg_per90", label: "xG/90" },
      { key: "dribbles_quality", label: "Dribbles Quality" },
      { key: "offensive_duels_quality", label: "Off Duels Quality" },
      { key: "xa_per90", label: "xA/90" },
      { key: "crosses_quality", label: "Crosses Quality" },
      { key: "carrying_quality", label: "Carrying Quality" },
    ],
  },
  {
    key: "FWD",
    label: "Forwards",
    color: "#ef6a6a",
    positions: ["CF"],
    axes: [
      { key: "goals_per90", label: "Goals/90" },
      { key: "xg_per90", label: "xG/90" },
      { key: "shots_quality", label: "Shots Quality" },
      { key: "touches_in_box_per90", label: "Touches in Box/90" },
      { key: "finishing_efficiency", label: "Finishing Efficiency" },
      { key: "offensive_duels_quality", label: "Off Duels Quality" },
      { key: "aerial_quality", label: "Aerial Quality" },
    ],
  },
];

function avgOf(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

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

export function DefenderRadar({
  teamName,
  players,
  leagueDefenderPool,
}: {
  teamName: string;
  players: NexusPlayerRow[];
  leagueDefenderPool: PlayerProfileRow[];
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridNeutral = isDark ? "#9a9a9f" : "#6b7280";
  const unselectedBorder = isDark ? "#2a2b30" : "#e5e7eb";
  const unselectedText = isDark ? "#9a9a9f" : "#6b7280";

  const [selectedKey, setSelectedKey] = useState(POSITION_GROUPS[0].key);
  const group = POSITION_GROUPS.find((g) => g.key === selectedKey) ?? POSITION_GROUPS[0];

  const teamRegulars = useMemo(
    () => players.filter((p) => group.positions.includes(p.position_group) && p.minutes_played >= REGULAR_MINUTES),
    [players, group]
  );

  const pool = useMemo(() => {
    const rows = leagueDefenderPool.filter((r) => group.positions.includes(r.position_group));
    const result: Record<string, number[]> = {};
    for (const field of PLAYER_PROFILE_FIELDS) {
      result[field] = rows.map((r) => r[field]).filter((v): v is number => typeof v === "number");
    }
    return result;
  }, [leagueDefenderPool, group]);

  const data = group.axes.map(({ key, label }) => {
    const teamAvg = avgOf(teamRegulars.map((p) => Number(p[key]) || 0));
    return {
      axis: label,
      [group.label]: percentileRank(pool[key] ?? [], teamAvg),
      "League Average": 50,
    };
  });

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Team Profile by Position</h3>
      <p className="text-xs text-gray-500 mb-4">
        Average of {teamName}&apos;s regular players (≥{REGULAR_MINUTES} minutes) per position group, percentile vs
        other players in the league at the same position — each position uses its own metrics, not a shared
        template. Dashed line = 50th percentile (league average).
      </p>

      <div className="flex gap-2 flex-wrap mb-4">
        {POSITION_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setSelectedKey(g.key)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border"
            style={
              selectedKey === g.key
                ? { backgroundColor: g.color, borderColor: g.color, color: "#14151a" }
                : { borderColor: unselectedBorder, color: unselectedText }
            }
          >
            {g.label}
          </button>
        ))}
      </div>

      {teamRegulars.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">No regular players in this position group yet.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={data} outerRadius={120} cy="45%">
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
              <Radar name={group.label} dataKey={group.label} stroke={group.color} fill={group.color} fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-5 mt-2 text-xs">
            <LegendItem color={gridNeutral} label="League Average (50th percentile)" dashed />
            <LegendItem color={group.color} label={`${teamName} — ${group.label}`} />
          </div>
        </>
      )}
    </div>
  );
}
