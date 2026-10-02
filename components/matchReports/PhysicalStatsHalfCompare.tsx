// components/matchReports/PhysicalStatsHalfCompare.tsx
// Per-player 1st-half vs 2nd-half physical output for one match — matched by
// playerId, so a player who only appears in one half (subbed on/off) still
// shows up with the other side blank rather than being dropped.
interface PlayerPhysicalStat {
  playerId: number;
  name: string;
  totalDistanceM: number | null;
  highSpeedRunningM: number | null;
  sprintDistanceM: number | null;
  topSpeedKmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutesPlayed: number | null;
}

function fmt(v: number | null, decimals = 0): string {
  return v === null ? "—" : v.toFixed(decimals);
}

function Delta({ a, b, decimals = 0, higherIsBetter = true }: { a: number | null; b: number | null; decimals?: number; higherIsBetter?: boolean }) {
  if (a === null || b === null) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  const diff = b - a;
  if (Math.abs(diff) < 10 ** -decimals / 2) return <span className="text-gray-400">0</span>;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  return (
    <span className={good ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
      {diff > 0 ? "+" : ""}
      {diff.toFixed(decimals)}
    </span>
  );
}

export function PhysicalStatsHalfCompare({ firstHalf, secondHalf }: { firstHalf: PlayerPhysicalStat[]; secondHalf: PlayerPhysicalStat[] }) {
  const byFirst = new Map(firstHalf.map((p) => [p.playerId, p]));
  const bySecond = new Map(secondHalf.map((p) => [p.playerId, p]));
  const playerIds = [...new Set([...byFirst.keys(), ...bySecond.keys()])];
  const rows = playerIds
    .map((id) => ({ id, name: (byFirst.get(id) ?? bySecond.get(id))!.name, a: byFirst.get(id) ?? null, b: bySecond.get(id) ?? null }))
    .sort((x, y) => (y.a?.totalDistanceM ?? y.b?.totalDistanceM ?? 0) - (x.a?.totalDistanceM ?? x.b?.totalDistanceM ?? 0));

  if (rows.length === 0) {
    return <p className="text-[11px] text-gray-500 dark:text-gray-400">No per-half physical stats imported for this match yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-gray-400 dark:text-gray-500">
            <th className="text-left font-semibold pb-1.5">Player</th>
            <th className="text-right font-semibold pb-1.5 px-2">Min 1H</th>
            <th className="text-right font-semibold pb-1.5 px-2">Min 2H</th>
            <th className="text-right font-semibold pb-1.5 px-2">Dist 1H</th>
            <th className="text-right font-semibold pb-1.5 px-2">Dist 2H</th>
            <th className="text-right font-semibold pb-1.5 px-2">Δ Dist</th>
            <th className="text-right font-semibold pb-1.5 px-2">HSR 1H</th>
            <th className="text-right font-semibold pb-1.5 px-2">HSR 2H</th>
            <th className="text-right font-semibold pb-1.5 px-2">Top Vel 1H</th>
            <th className="text-right font-semibold pb-1.5">Top Vel 2H</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100 dark:border-[#2a2b30]">
              <td className="py-1.5 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{r.name}</td>
              <td className="text-right py-1.5 px-2 text-gray-500 dark:text-gray-400">{fmt(r.a?.minutesPlayed ?? null)}</td>
              <td className="text-right py-1.5 px-2 text-gray-500 dark:text-gray-400">{fmt(r.b?.minutesPlayed ?? null)}</td>
              <td className="text-right py-1.5 px-2 text-gray-900 dark:text-white">{fmt(r.a?.totalDistanceM ?? null)}</td>
              <td className="text-right py-1.5 px-2 text-gray-900 dark:text-white">{fmt(r.b?.totalDistanceM ?? null)}</td>
              <td className="text-right py-1.5 px-2">
                <Delta a={r.a?.totalDistanceM ?? null} b={r.b?.totalDistanceM ?? null} />
              </td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.a?.highSpeedRunningM ?? null)}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.b?.highSpeedRunningM ?? null)}</td>
              <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.a?.topSpeedKmh ?? null, 1)}</td>
              <td className="text-right py-1.5 text-gray-600 dark:text-gray-300">{fmt(r.b?.topSpeedKmh ?? null, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
