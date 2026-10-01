// components/physicalStats/CompareTable.tsx
import type { ComparePlayerRow, SideStats } from "@/lib/physicalStats/fetchPhysicalStatsCompare";

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

interface Metric {
  key: keyof SideStats;
  label: string;
  decimals?: number;
  higherIsBetter?: boolean;
}

const METRICS: Metric[] = [
  { key: "minutesPlayed", label: "Minutes" },
  { key: "totalDistanceM", label: "Distance (m)" },
  { key: "highSpeedRunningM", label: "HSR (m)" },
  { key: "sprintDistanceM", label: "Sprint (m)" },
  { key: "topSpeedKmh", label: "Top Speed (km/h)", decimals: 1 },
  { key: "accelerations", label: "Accel" },
  { key: "decelerations", label: "Decel", higherIsBetter: false },
];

function SideCell({ side, metric }: { side: SideStats | null; metric: Metric }) {
  return <td className="text-right py-1.5 px-2 text-gray-900 dark:text-white font-semibold">{side ? fmt(side[metric.key], metric.decimals ?? 0) : "—"}</td>;
}

function Row({ label, a, b, metric }: { label: string; a: SideStats | null; b: SideStats | null; metric: Metric }) {
  return (
    <tr className="border-t border-gray-100 dark:border-[#2a2b30]">
      <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</td>
      <SideCell side={a} metric={metric} />
      <SideCell side={b} metric={metric} />
      <td className="text-right py-1.5 px-2">
        <Delta a={a?.[metric.key] ?? null} b={b?.[metric.key] ?? null} decimals={metric.decimals ?? 0} higherIsBetter={metric.higherIsBetter ?? true} />
      </td>
    </tr>
  );
}

export function CompareTable({
  labelA,
  labelB,
  rows,
  teamAverage,
}: {
  labelA: string;
  labelB: string;
  rows: ComparePlayerRow[];
  teamAverage: { a: SideStats | null; b: SideStats | null };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Team average</h3>
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-[#2a2b30]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#15161a]">
                <th className="text-left font-semibold py-1.5 pl-3 pr-3"></th>
                <th className="text-right font-semibold py-1.5 px-2">{labelA}</th>
                <th className="text-right font-semibold py-1.5 px-2">{labelB}</th>
                <th className="text-right font-semibold py-1.5 px-2 pr-3">Δ</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <Row key={m.key} label={m.label} a={teamAverage.a} b={teamAverage.b} metric={m} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Per player</h3>
        {rows.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No matched players between these two sessions.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-[#2a2b30]">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#15161a]">
                  <th className="text-left font-semibold py-1.5 pl-3 pr-3">Player</th>
                  <th className="text-right font-semibold py-1.5 px-2">Dist A (m)</th>
                  <th className="text-right font-semibold py-1.5 px-2">Dist B (m)</th>
                  <th className="text-right font-semibold py-1.5 px-2">Δ Dist</th>
                  <th className="text-right font-semibold py-1.5 px-2">HSR A</th>
                  <th className="text-right font-semibold py-1.5 px-2">HSR B</th>
                  <th className="text-right font-semibold py-1.5 px-2">Top Vel A</th>
                  <th className="text-right font-semibold py-1.5 px-2">Top Vel B</th>
                  <th className="text-right font-semibold py-1.5 px-2 pr-3">Min A / B</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.playerId} className="border-t border-gray-100 dark:border-[#2a2b30]">
                    <td className="py-1.5 pl-3 pr-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {r.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2a2b30] shrink-0" />
                        )}
                        {r.playerName}
                      </div>
                    </td>
                    <td className="text-right py-1.5 px-2 text-gray-900 dark:text-white">{fmt(r.a?.totalDistanceM ?? null)}</td>
                    <td className="text-right py-1.5 px-2 text-gray-900 dark:text-white">{fmt(r.b?.totalDistanceM ?? null)}</td>
                    <td className="text-right py-1.5 px-2">
                      <Delta a={r.a?.totalDistanceM ?? null} b={r.b?.totalDistanceM ?? null} />
                    </td>
                    <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.a?.highSpeedRunningM ?? null)}</td>
                    <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.b?.highSpeedRunningM ?? null)}</td>
                    <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.a?.topSpeedKmh ?? null, 1)}</td>
                    <td className="text-right py-1.5 px-2 text-gray-600 dark:text-gray-300">{fmt(r.b?.topSpeedKmh ?? null, 1)}</td>
                    <td className="text-right py-1.5 px-2 pr-3 text-gray-500 dark:text-gray-400">
                      {fmt(r.a?.minutesPlayed ?? null)} / {fmt(r.b?.minutesPlayed ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
