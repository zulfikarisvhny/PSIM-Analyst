// components/style/SeasonStatComparisonCard.tsx
"use client";
import { useState } from "react";
import type { SeasonStatComparisonRow } from "@/lib/scouting/seasonStatComparison";

const DEFAULT_VISIBLE = 8;

function ComparisonRow({ row }: { row: SeasonStatComparisonRow }) {
  const { thisSeasonAvg, lastSeasonAvg } = row;
  let thisPct = 50;
  let lastPct = 50;
  if (thisSeasonAvg !== null && lastSeasonAvg !== null && thisSeasonAvg + lastSeasonAvg > 0) {
    thisPct = (thisSeasonAvg / (thisSeasonAvg + lastSeasonAvg)) * 100;
    lastPct = 100 - thisPct;
  }

  const fmt = (v: number | null) => (v === null ? "—" : `${v.toFixed(row.decimals)}${row.unit ?? ""}`);

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-2 text-xs mb-1">
        <span className="font-mono font-bold text-gray-900 dark:text-white w-20 shrink-0">{fmt(thisSeasonAvg)}</span>
        <span className="text-gray-500 dark:text-gray-400 text-center flex-1 truncate uppercase tracking-wide text-[10px]">{row.label}</span>
        <span className="font-mono font-bold text-gray-900 dark:text-white w-20 shrink-0 text-right">{fmt(lastSeasonAvg)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-[#0e0e10]">
        <div className="bg-blue-600 dark:bg-[#3987e5]" style={{ width: `${thisPct}%` }} />
        <div className="bg-gray-400 dark:bg-gray-600" style={{ width: `${lastPct}%` }} />
      </div>
    </div>
  );
}

export function SeasonStatComparisonCard({ rows }: { rows: SeasonStatComparisonRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE);

  if (rows.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No comparable match stats yet.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-2">
        <span>2026/2027 (avg per match)</span>
        <span>2025/2026 (avg per match)</span>
      </div>
      {visibleRows.map((row) => (
        <ComparisonRow key={row.label} row={row} />
      ))}
      {rows.length > DEFAULT_VISIBLE && (
        <button onClick={() => setExpanded((e) => !e)} className="text-xs font-semibold text-blue-600 dark:text-[#ffcf4d] mt-3">
          {expanded ? "Show fewer stats" : `Show all ${rows.length} stats`}
        </button>
      )}
    </div>
  );
}
