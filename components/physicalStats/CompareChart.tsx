// components/physicalStats/CompareChart.tsx
// Per-player bar comparison for one metric at a time — two stacked bars
// (session A, session B) scaled to a shared max so a longer/shorter bar
// reads as an increase/decrease at a glance, plus a +/- delta badge. The
// player's photo sits beside the whole block (name line + both bars), not
// just the name, and a trend filter narrows the list to who improved or
// dropped off between the two sessions.
"use client";
import { useMemo, useState } from "react";
import type { ComparePlayerRow, SideStats } from "@/lib/physicalStats/fetchPhysicalStatsCompare";

function fmt(v: number | null, decimals = 0): string {
  return v === null ? "—" : v.toFixed(decimals);
}

type Trend = "all" | "up" | "down";

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
  const [trend, setTrend] = useState<Trend>("all");

  const withDelta = useMemo(() => {
    return rows
      .filter((r) => r.a?.[metric] !== undefined || r.b?.[metric] !== undefined)
      .map((r) => {
        const aVal = r.a?.[metric] ?? null;
        const bVal = r.b?.[metric] ?? null;
        const delta = aVal !== null && bVal !== null ? bVal - aVal : null;
        const good = delta !== null && (higherIsBetter ? delta > 0 : delta < 0);
        const bad = delta !== null && (higherIsBetter ? delta < 0 : delta > 0);
        return { r, aVal, bVal, delta, good, bad };
      });
  }, [rows, metric, higherIsBetter]);

  const upCount = withDelta.filter((x) => x.good).length;
  const downCount = withDelta.filter((x) => x.bad).length;

  const filtered = withDelta.filter((x) => (trend === "all" ? true : trend === "up" ? x.good : x.bad));
  const max = Math.max(1, ...withDelta.map((x) => Math.max(x.aVal ?? 0, x.bVal ?? 0)));

  if (withDelta.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No data for this metric in either session.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> {labelA}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /> {labelB}
          </span>
        </div>
        <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold">
          {(
            [
              ["all", `All (${withDelta.length})`],
              ["up", `Up (${upCount})`],
              ["down", `Down (${downCount})`],
            ] as [Trend, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrend(t)}
              className={`px-2.5 py-1 ${
                trend === t
                  ? t === "up"
                    ? "bg-emerald-600 text-white"
                    : t === "down"
                      ? "bg-red-500 text-white"
                      : "bg-blue-600 text-white"
                  : "bg-white dark:bg-[#191a1d] text-gray-600 dark:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No players in this filter.</p>
      ) : (
        filtered.map(({ r, aVal, bVal, delta, good, bad }) => (
          <div key={r.playerId} className="flex items-center gap-3">
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2a2b30] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
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
          </div>
        ))
      )}
    </div>
  );
}
