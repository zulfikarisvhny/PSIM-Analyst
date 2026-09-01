// components/scouting/QuickStats.tsx
import { LeagueTeamRow } from "@/lib/scouting/types";

const STATS: {
  label: string;
  get: (r: LeagueTeamRow) => number;
  higherIsBetter: boolean;
  unit: string;
  decimals: number;
}[] = [
  { label: "Goals / Match", get: (r) => r.goals / r.MP, higherIsBetter: true, unit: "", decimals: 2 },
  { label: "xG / Match", get: (r) => r.xg / r.MP, higherIsBetter: true, unit: "", decimals: 2 },
  { label: "Goals Conceded / Match", get: (r) => r.opp_goals / r.MP, higherIsBetter: false, unit: "", decimals: 2 },
  { label: "Possession", get: (r) => r["Poss %"], higherIsBetter: true, unit: "%", decimals: 1 },
  { label: "Pass Accuracy", get: (r) => r["Pass Acc %"], higherIsBetter: true, unit: "%", decimals: 1 },
  { label: "Fouls / Match", get: (r) => r.fouls_committed / r.MP, higherIsBetter: false, unit: "", decimals: 1 },
];

export function QuickStats({ rows, focusTeam }: { rows: LeagueTeamRow[]; focusTeam: string }) {
  const focusRow = rows.find((r) => r.Team === focusTeam);
  if (!focusRow) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STATS.map((stat) => {
        const value = stat.get(focusRow);
        const avg = rows.reduce((s, r) => s + stat.get(r), 0) / rows.length;
        const diff = value - avg;
        const isGood = stat.higherIsBetter ? diff >= 0 : diff <= 0;

        return (
          <div key={stat.label} className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{stat.label}</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {value.toFixed(stat.decimals)}{stat.unit}
            </div>
            <div className={`text-xs mt-1 ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {isGood ? "▲" : "▼"} vs league avg {avg.toFixed(stat.decimals)}{stat.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
