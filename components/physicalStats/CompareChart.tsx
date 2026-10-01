// components/physicalStats/CompareChart.tsx
// Per-player bar comparison for one metric at a time — two stacked bars
// (session A, session B) scaled to a shared max so a longer/shorter bar
// reads as an increase/decrease at a glance, plus a +/- delta badge.
import type { ComparePlayerRow, SideStats } from "@/lib/physicalStats/fetchPhysicalStatsCompare";

function fmt(v: number | null, decimals = 0): string {
  return v === null ? "—" : v.toFixed(decimals);
}

export function CompareChart({
  labelA,
  labelB,
  rows,
  metric,
  decimals = 0,
  higherIsBetter = true,
}: {
  labelA: string;
  labelB: string;
  rows: ComparePlayerRow[];
  metric: keyof SideStats;
  decimals?: number;
  higherIsBetter?: boolean;
}) {
  const withData = rows.filter((r) => r.a?.[metric] !== undefined || r.b?.[metric] !== undefined);
  const max = Math.max(1, ...withData.map((r) => Math.max(r.a?.[metric] ?? 0, r.b?.[metric] ?? 0)));

  if (withData.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No data for this metric in either session.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> {labelA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /> {labelB}
        </span>
      </div>
      {withData.map((r) => {
        const aVal = r.a?.[metric] ?? null;
        const bVal = r.b?.[metric] ?? null;
        const delta = aVal !== null && bVal !== null ? bVal - aVal : null;
        const good = delta !== null && (higherIsBetter ? delta > 0 : delta < 0);
        const bad = delta !== null && (higherIsBetter ? delta < 0 : delta > 0);
        return (
          <div key={r.playerId}>
            <div className="flex items-baseline gap-2 mb-1">
              {r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 self-center" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2a2b30] shrink-0 self-center" />
              )}
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{r.playerName}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(bVal, decimals)}</span>
              {delta !== null && Math.abs(delta) >= 10 ** -decimals / 2 && (
                <span className={`text-xs font-bold ${good ? "text-emerald-600 dark:text-emerald-400" : bad ? "text-red-500 dark:text-red-400" : "text-gray-400"}`}>
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(decimals)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-2 rounded-full bg-gray-100 dark:bg-[#2a2b30] overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${((aVal ?? 0) / max) * 100}%` }} />
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-[#2a2b30] overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${((bVal ?? 0) / max) * 100}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
