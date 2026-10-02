// components/matchReports/PhysicalStatsHalfCompare.tsx
// Per-player physical output for one match: the whole-game total as the
// headline number, with 1st-half and 2nd-half as two same-scale bars below
// so a drop-off (or a second-half surge) is visible at a glance — same
// visual language as the GPS session compare page's chart view.
"use client";
import { useState } from "react";

interface PlayerPhysicalStat {
  playerId: number;
  name: string;
  photoUrl: string | null;
  totalDistanceM: number | null;
  highSpeedRunningM: number | null;
  sprintDistanceM: number | null;
  topSpeedKmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutesPlayed: number | null;
}

type MetricKey = "totalDistanceM" | "highSpeedRunningM" | "sprintDistanceM" | "topSpeedKmh" | "accelerations" | "decelerations" | "minutesPlayed";

const METRICS: { key: MetricKey; label: string; decimals?: number; higherIsBetter?: boolean }[] = [
  { key: "totalDistanceM", label: "Distance (m)" },
  { key: "highSpeedRunningM", label: "HSR (m)" },
  { key: "sprintDistanceM", label: "Sprint (m)" },
  { key: "topSpeedKmh", label: "Top Speed (km/h)", decimals: 1 },
  { key: "accelerations", label: "Accelerations" },
  { key: "decelerations", label: "Decelerations", higherIsBetter: false },
  { key: "minutesPlayed", label: "Minutes" },
];

function fmt(v: number | null, decimals = 0): string {
  return v === null ? "—" : v.toFixed(decimals);
}

type Trend = "all" | "up" | "down";

export function PhysicalStatsHalfCompare({
  total,
  firstHalf,
  secondHalf,
}: {
  total: PlayerPhysicalStat[];
  firstHalf: PlayerPhysicalStat[];
  secondHalf: PlayerPhysicalStat[];
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>("totalDistanceM");
  const [trend, setTrend] = useState<Trend>("all");
  const metric = METRICS.find((m) => m.key === metricKey)!;
  const decimals = metric.decimals ?? 0;
  const higherIsBetter = metric.higherIsBetter ?? true;

  const byTotal = new Map(total.map((p) => [p.playerId, p]));
  const byFirst = new Map(firstHalf.map((p) => [p.playerId, p]));
  const bySecond = new Map(secondHalf.map((p) => [p.playerId, p]));
  const playerIds = [...new Set([...byTotal.keys(), ...byFirst.keys(), ...bySecond.keys()])];

  const rows = playerIds
    .map((id) => {
      const t = byTotal.get(id) ?? null;
      const a = byFirst.get(id) ?? null;
      const b = bySecond.get(id) ?? null;
      const aVal = a?.[metric.key] ?? null;
      const bVal = b?.[metric.key] ?? null;
      const delta = aVal !== null && bVal !== null ? bVal - aVal : null;
      const good = delta !== null && (higherIsBetter ? delta > 0 : delta < 0);
      const bad = delta !== null && (higherIsBetter ? delta < 0 : delta > 0);
      return {
        id,
        name: t?.name ?? a?.name ?? b?.name ?? `Player #${id}`,
        photoUrl: t?.photoUrl ?? a?.photoUrl ?? b?.photoUrl ?? null,
        totalVal: t?.[metric.key] ?? null,
        aVal,
        bVal,
        delta,
        good,
        bad,
      };
    })
    .filter((r) => r.aVal !== null || r.bVal !== null)
    .sort((x, y) => (y.totalVal ?? y.bVal ?? 0) - (x.totalVal ?? x.bVal ?? 0));

  const upCount = rows.filter((r) => r.good).length;
  const downCount = rows.filter((r) => r.bad).length;
  const filtered = rows.filter((r) => (trend === "all" ? true : trend === "up" ? r.good : r.bad));
  const max = Math.max(1, ...rows.map((r) => Math.max(r.aVal ?? 0, r.bVal ?? 0)));

  if (rows.length === 0) {
    return <p className="text-[11px] text-gray-500 dark:text-gray-400">No per-half physical stats imported for this match yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetricKey(m.key)}
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
              metricKey === m.key
                ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] border-blue-600 dark:border-[#ffcf4d]"
                : "bg-white dark:bg-[#191a1d] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2a2b30]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> 1st Half
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" /> 2nd Half
          </span>
        </div>
        <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold">
          {(
            [
              ["all", `All (${rows.length})`],
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
        filtered.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2a2b30] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{r.name}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(r.totalVal, decimals)}</span>
                {r.delta !== null && Math.abs(r.delta) >= 10 ** -decimals / 2 && (
                  <span className={`text-xs font-bold ${r.good ? "text-emerald-600 dark:text-emerald-400" : r.bad ? "text-red-500 dark:text-red-400" : "text-gray-400"}`}>
                    {r.delta > 0 ? "+" : ""}
                    {r.delta.toFixed(decimals)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-2 rounded-full bg-gray-100 dark:bg-[#2a2b30] overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${((r.aVal ?? 0) / max) * 100}%` }} />
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-[#2a2b30] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${((r.bVal ?? 0) / max) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
