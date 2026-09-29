// components/matchReports/ZoneMap.tsx
"use client";
import { useState } from "react";

const PSIM = "PSIM Yogyakarta";

interface ZoneEvent {
  xPct: number; // 0-100, that team's own attack direction (own goal = 0, opponent goal = 100)
  yPct: number; // 0-100, touchline to touchline
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

// Thirds along the attack direction (defensive / middle / final), channels across the width (left / center / right).
const X_BOUNDS = [0, 35, 70, 105];
const Y_BOUNDS = [0, 22.67, 45.33, 68];
const THIRD_LABELS = ["Defensive third", "Middle third", "Final third"];

function TeamZoneMap({ kind, events }: { kind: "loss" | "recovery"; events: ZoneEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No {kind === "loss" ? "loss" : "recovery"} location data available for this side.</p>;
  }

  const grid: number[][] = [0, 1, 2].map(() => [0, 0, 0]); // grid[thirdIdx][channelIdx]
  for (const e of events) {
    const thirdIdx = Math.min(2, Math.floor((e.xPct / 100) * 3));
    const channelIdx = Math.min(2, Math.floor((e.yPct / 100) * 3));
    grid[thirdIdx][channelIdx]++;
  }
  const maxCount = Math.max(...grid.flat(), 1);
  const total = events.length;
  const color = kind === "loss" ? "239, 68, 68" : "34, 197, 94"; // red / green, as an "r, g, b" triplet for rgba()

  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
        {total} {kind === "loss" ? "losses" : "recoveries"} by zone. Darker = more events.
      </p>
      <div className="relative w-full max-w-2xl mx-auto rounded-md overflow-hidden" style={{ aspectRatio: "105 / 68", background: "#5aa06a" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 105 68" preserveAspectRatio="none">
          {grid.map((row, thirdIdx) =>
            row.map((count, channelIdx) => {
              const x0 = X_BOUNDS[thirdIdx];
              const x1 = X_BOUNDS[thirdIdx + 1];
              const y0 = Y_BOUNDS[channelIdx];
              const y1 = Y_BOUNDS[channelIdx + 1];
              const opacity = 0.12 + (count / maxCount) * 0.68;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <g key={`${thirdIdx}-${channelIdx}`}>
                  <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={`rgba(${color}, ${opacity})`} stroke="white" strokeOpacity={0.25} strokeWidth={0.2} />
                  <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 - 1.2} textAnchor="middle" fontSize={4.2} fontWeight="700" fill="white">
                    {count}
                  </text>
                  <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 + 3.2} textAnchor="middle" fontSize={2.6} fill="white" fillOpacity={0.85}>
                    {pct}%
                  </text>
                </g>
              );
            })
          )}
          <FullPitchMarkings />
        </svg>
      </div>
      <div className="flex items-center justify-between max-w-2xl mx-auto mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 px-1">
        {THIRD_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function ZoneMap({
  kind,
  homeTeam,
  awayTeam,
  homeEvents,
  awayEvents,
}: {
  kind: "loss" | "recovery";
  homeTeam: string;
  awayTeam: string;
  homeEvents: ZoneEvent[];
  awayEvents: ZoneEvent[];
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
      <TeamZoneMap kind={kind} events={side === "home" ? homeEvents : awayEvents} />
    </div>
  );
}
