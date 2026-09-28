// components/matchReports/PhysicalStatsTable.tsx
interface PlayerPhysicalStat {
  playerId: number;
  name: string;
  totalDistanceM: number | null;
  highSpeedRunningM: number | null;
  sprintDistanceM: number | null;
  sprintCount: number | null;
  topSpeedKmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutesPlayed: number | null;
}

function fmt(v: number | null, decimals = 0): string {
  return v === null ? "—" : v.toFixed(decimals);
}

export function PhysicalStatsTable({ players }: { players: PlayerPhysicalStat[] }) {
  if (players.length === 0) {
    return <p className="text-[11px] text-gray-500 dark:text-gray-400">No physical stats imported for this match yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-gray-400 dark:text-gray-500">
            <th className="text-left font-semibold pb-1.5">Player</th>
            <th className="text-right font-semibold pb-1.5 px-2">Min</th>
            <th className="text-right font-semibold pb-1.5 px-2">Distance (m)</th>
            <th className="text-right font-semibold pb-1.5 px-2">HSR (m)</th>
            <th className="text-right font-semibold pb-1.5 px-2">Sprint (m)</th>
            <th className="text-right font-semibold pb-1.5 px-2">Sprints</th>
            <th className="text-right font-semibold pb-1.5 px-2">Top Speed</th>
            <th className="text-right font-semibold pb-1.5 px-2">Accel</th>
            <th className="text-right font-semibold pb-1.5">Decel</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.playerId} className="border-t border-gray-100 dark:border-[#2a2b30]">
              <td className="py-1.5 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{p.name}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(p.minutesPlayed, 0)}</td>
              <td className="text-right py-1.5 px-2 text-gray-900 dark:text-white font-semibold">{fmt(p.totalDistanceM, 0)}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(p.highSpeedRunningM, 0)}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(p.sprintDistanceM, 0)}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{p.sprintCount ?? "—"}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(p.topSpeedKmh, 1)} km/h</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{p.accelerations ?? "—"}</td>
              <td className="text-right py-1.5 text-gray-600 dark:text-gray-300">{p.decelerations ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
