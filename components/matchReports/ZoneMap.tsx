// components/matchReports/ZoneMap.tsx
"use client";
import { useState } from "react";

const PSIM = "PSIM Yogyakarta";

export interface ZoneEvent {
  xPct: number; // 0-100, that team's own attack direction (own goal = 0, opponent goal = 100)
  yPct: number; // 0-100, touchline to touchline
  playerName: string;
  jersey: number | null;
}

const PITCH_LINE = { stroke: "white", strokeOpacity: 0.45, strokeWidth: 0.35, fill: "none" } as const;

function FullPitchMarkings() {
  return (
    <g>
      <rect x={0.3} y={0.3} width={104.4} height={67.4} {...PITCH_LINE} />
      <line x1={52.5} y1={0.3} x2={52.5} y2={67.7} {...PITCH_LINE} />
      <circle cx={52.5} cy={34} r={9.15} {...PITCH_LINE} />
      <rect x={0.3} y={13.84} width={16.2} height={40.32} {...PITCH_LINE} />
      <rect x={0.3} y={24.84} width={5.2} height={18.32} {...PITCH_LINE} />
      <rect x={88.5} y={13.84} width={16.2} height={40.32} {...PITCH_LINE} />
      <rect x={99.5} y={24.84} width={5.2} height={18.32} {...PITCH_LINE} />
    </g>
  );
}

// 6 columns along the attack direction x 3 rows across the width = 18 zones,
// numbered column-major (1-3 in column 1, 4-6 in column 2, ...) to match the
// reference layout.
const COLS = 6;
const ROWS = 3;
const X_BOUNDS = Array.from({ length: COLS + 1 }, (_, i) => (i * 105) / COLS);
const Y_BOUNDS = Array.from({ length: ROWS + 1 }, (_, i) => (i * 68) / ROWS);

function zoneOf(e: ZoneEvent): { col: number; row: number } {
  const col = Math.min(COLS - 1, Math.floor((e.xPct / 100) * COLS));
  const row = Math.min(ROWS - 1, Math.floor((e.yPct / 100) * ROWS));
  return { col, row };
}

export function TeamZoneMap({ kind, events, matchesCount }: { kind: "loss" | "recovery"; events: ZoneEvent[]; matchesCount?: number }) {
  const [selected, setSelected] = useState<{ col: number; row: number } | null>(null);
  const [mode, setMode] = useState<"total" | "average">("total");
  const showToggle = !!matchesCount && matchesCount > 1;
  const divisor = showToggle && mode === "average" ? matchesCount! : 1;

  if (events.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No {kind === "loss" ? "loss" : "recovery"} location data available for this side.</p>;
  }

  const grid: ZoneEvent[][][] = Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => [] as ZoneEvent[]));
  for (const e of events) {
    const { col, row } = zoneOf(e);
    grid[col][row].push(e);
  }
  const counts = grid.map((col) => col.map((cell) => cell.length));
  const maxCount = Math.max(...counts.flat(), 1);
  const total = events.length;
  const color = kind === "loss" ? "239, 68, 68" : "34, 197, 94"; // red / green, as an "r, g, b" triplet for rgba()

  const selectedEvents = selected ? grid[selected.col][selected.row] : [];
  const playerRanking = (() => {
    const byPlayer = new Map<string, number>();
    for (const e of selectedEvents) byPlayer.set(e.playerName, (byPlayer.get(e.playerName) ?? 0) + 1);
    return [...byPlayer.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const topPlayers = (() => {
    const byPlayer = new Map<string, number>();
    for (const e of events) byPlayer.set(e.playerName, (byPlayer.get(e.playerName) ?? 0) + 1);
    return [...byPlayer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  function fmt(n: number): string {
    return divisor === 1 ? String(n) : (n / divisor).toFixed(1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {fmt(total)} {kind === "loss" ? "losses" : "recoveries"} by zone{showToggle && mode === "average" ? ` (avg per match, ${matchesCount} matches)` : ""}. Click a zone for
          detail.
        </p>
        {showToggle && (
          <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[10px] font-semibold shrink-0">
            {(["total", "average"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-1 capitalize ${
                  mode === m ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-600 dark:text-gray-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative w-full max-w-2xl mx-auto rounded-md overflow-hidden" style={{ aspectRatio: "105 / 68", background: "#5aa06a" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 105 68" preserveAspectRatio="none">
          {counts.map((col, colIdx) =>
            col.map((count, rowIdx) => {
              const x0 = X_BOUNDS[colIdx];
              const x1 = X_BOUNDS[colIdx + 1];
              const y0 = Y_BOUNDS[rowIdx];
              const y1 = Y_BOUNDS[rowIdx + 1];
              const isSelected = selected?.col === colIdx && selected?.row === rowIdx;
              const dimmed = selected !== null && !isSelected;
              const opacity = (0.12 + (count / maxCount) * 0.68) * (dimmed ? 0.35 : 1);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const zoneNumber = colIdx * ROWS + rowIdx + 1;
              return (
                <g
                  key={`${colIdx}-${rowIdx}`}
                  onClick={() => setSelected(isSelected ? null : { col: colIdx, row: rowIdx })}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x0}
                    y={y0}
                    width={x1 - x0}
                    height={y1 - y0}
                    fill={`rgba(${color}, ${opacity})`}
                    stroke={isSelected ? "#facc15" : "white"}
                    strokeOpacity={isSelected ? 1 : 0.25}
                    strokeWidth={isSelected ? 0.6 : 0.2}
                  />
                  <text x={x0 + 1.2} y={y0 + 2.8} fontSize={2} fill="white" fillOpacity={0.6}>
                    {zoneNumber}
                  </text>
                  <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 - 1.2} textAnchor="middle" fontSize={4.2} fontWeight="700" fill="white">
                    {fmt(count)}
                  </text>
                  <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 + 3.2} textAnchor="middle" fontSize={2.6} fill="white" fillOpacity={0.85}>
                    {pct}%
                  </text>
                </g>
              );
            })
          )}
          <FullPitchMarkings />
          {selected &&
            selectedEvents.map((e, i) => (
              <circle key={i} cx={(e.xPct / 100) * 105} cy={(e.yPct / 100) * 68} r={1} fill="#facc15" stroke="#1f2937" strokeWidth={0.2}>
                <title>{e.playerName}</title>
              </circle>
            ))}
        </svg>
      </div>

      <div className="max-w-2xl mx-auto mt-3">
        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Top 5 players</p>
        <div className="flex flex-col gap-1">
          {topPlayers.map(([name, count], i) => (
            <div key={name} className="flex items-center gap-2 text-[11px]">
              <span className="w-4 h-4 shrink-0 rounded-full bg-gray-100 dark:bg-[#2a2b30] text-gray-500 dark:text-gray-400 flex items-center justify-center text-[9px] font-bold">
                {i + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-200 truncate flex-1">{name}</span>
              <span className="font-semibold text-gray-900 dark:text-white shrink-0">
                {fmt(count)} {kind === "loss" ? "losses" : "recoveries"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="max-w-2xl mx-auto mt-2 p-3 rounded-md border border-gray-200 dark:border-[#2a2b30]">
          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
            Zone {selected.col * ROWS + selected.row + 1} — {fmt(selectedEvents.length)} {kind === "loss" ? "losses" : "recoveries"}
          </p>
          {playerRanking.length === 0 ? (
            <p className="text-[11px] text-gray-400">No events in this zone.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {playerRanking.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-700 dark:text-gray-200 truncate">{name}</span>
                  <span className="font-semibold text-gray-900 dark:text-white shrink-0 ml-2">{fmt(count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ZoneMap({
  kind,
  homeTeam,
  awayTeam,
  homeEvents,
  awayEvents,
  homeMatchesCount,
  awayMatchesCount,
}: {
  kind: "loss" | "recovery";
  homeTeam: string;
  awayTeam: string;
  homeEvents: ZoneEvent[];
  awayEvents: ZoneEvent[];
  homeMatchesCount?: number;
  awayMatchesCount?: number;
}) {
  const [side, setSide] = useState<"home" | "away">(awayTeam === PSIM ? "away" : "home");
  return (
    <div>
      <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold w-fit mb-3">
        <button
          onClick={() => setSide("home")}
          className={`px-3 py-1.5 ${
            side === "home" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          {homeTeam}
        </button>
        <button
          onClick={() => setSide("away")}
          className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
            side === "away" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          {awayTeam}
        </button>
      </div>
      {side === "home" ? (
        <TeamZoneMap kind={kind} events={homeEvents} matchesCount={homeMatchesCount} />
      ) : (
        <TeamZoneMap kind={kind} events={awayEvents} matchesCount={awayMatchesCount} />
      )}
    </div>
  );
}
