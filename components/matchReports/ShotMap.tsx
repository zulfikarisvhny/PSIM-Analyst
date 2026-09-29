// components/matchReports/ShotMap.tsx
"use client";
import { useState } from "react";

const PSIM = "PSIM Yogyakarta";

interface ShotEntry {
  playerName: string;
  jersey: number | null;
  minute: string | null;
  shotType: string | null;
  outcome: "goal" | "on_target" | "blocked" | "wide" | null;
  xg: number | null;
  psxg: number | null;
  xPct: number;
  yPct: number;
}

const OUTCOME_STYLE: Record<NonNullable<ShotEntry["outcome"]>, { fill: string; label: string }> = {
  goal: { fill: "#f59e0b", label: "Goal" },
  on_target: { fill: "#3b82f6", label: "On target" },
  blocked: { fill: "#6b7280", label: "Blocked" },
  wide: { fill: "#cbd5e1", label: "Wide" },
};

const PITCH_LINE = { stroke: "white", strokeOpacity: 0.45, strokeWidth: 0.35, fill: "none" } as const;

function minuteSortValue(minute: string | null): number {
  const m = minute?.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
}

/** Small marker matching the PDF's own shot-list icon per outcome: circle = on target, square = blocked, dashed circle = wide, diamond = goal. */
function OutcomeMarker({ outcome, index }: { outcome: ShotEntry["outcome"]; index: number }) {
  const style = outcome ? OUTCOME_STYLE[outcome] : OUTCOME_STYLE.wide;
  const base = "w-6 h-6 shrink-0 flex items-center justify-center text-[10px] font-bold";
  if (outcome === "goal") {
    return (
      <span className={`${base} rotate-45`} style={{ background: style.fill, color: "white" }}>
        <span className="-rotate-45">{index}</span>
      </span>
    );
  }
  if (outcome === "blocked") {
    return (
      <span className={base} style={{ background: style.fill, color: "white" }}>
        {index}
      </span>
    );
  }
  if (outcome === "wide") {
    return (
      <span className={`${base} rounded-full border border-dashed`} style={{ borderColor: "#94a3b8", color: "#64748b" }}>
        {index}
      </span>
    );
  }
  return (
    <span className={`${base} rounded-full`} style={{ background: style.fill, color: "white" }}>
      {index}
    </span>
  );
}

function ShotTable({ shots }: { shots: ShotEntry[] }) {
  const sorted = [...shots].sort((a, b) => minuteSortValue(a.minute) - minuteSortValue(b.minute));
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-[#2a2b30]">
            <th className="py-1.5 pr-2 font-normal w-8"></th>
            <th className="py-1.5 pr-2 font-normal">Player</th>
            <th className="py-1.5 pr-2 font-normal">Time</th>
            <th className="py-1.5 pr-2 font-normal">Shot type</th>
            <th className="py-1.5 pr-2 font-normal text-right">xG</th>
            <th className="py-1.5 font-normal text-right">PsxG</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={i}
              className={`border-b border-gray-100 dark:border-[#232427] ${s.outcome === "goal" ? "bg-amber-50 dark:bg-amber-500/10 font-semibold" : ""}`}
            >
              <td className="py-1.5 pr-2">
                <OutcomeMarker outcome={s.outcome} index={i + 1} />
              </td>
              <td className="py-1.5 pr-2 text-gray-800 dark:text-gray-200">
                <span className="text-gray-400 dark:text-gray-500 mr-1">#{s.jersey ?? "?"}</span>
                {s.playerName}
              </td>
              <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{s.minute}&apos;</td>
              <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{s.shotType}</td>
              <td className="py-1.5 pr-2 text-right text-gray-800 dark:text-gray-200">{s.xg !== null ? s.xg.toFixed(2) : "-"}</td>
              <td className="py-1.5 text-right text-gray-800 dark:text-gray-200">{s.psxg !== null ? s.psxg.toFixed(2) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Attacking-half 68 x 52.5 pitch markings, goal at the top. */
function HalfPitchMarkings() {
  return (
    <g>
      <rect x={0.3} y={0.3} width={67.4} height={52} {...PITCH_LINE} />
      <rect x={13.84} y={0.3} width={40.32} height={16.2} {...PITCH_LINE} />
      <rect x={24.84} y={0.3} width={18.32} height={5.2} {...PITCH_LINE} />
      <circle cx={34} cy={11} r={0.35} fill="white" fillOpacity={0.45} />
    </g>
  );
}

function TeamShotMap({ shots }: { shots: ShotEntry[] }) {
  const maxXg = Math.max(...shots.map((e) => e.xg ?? 0), 0.05);
  const radiusFor = (xg: number | null) => 1.1 + Math.sqrt(Math.max(xg ?? 0, 0) / maxXg) * 2.3;
  const counts = { goal: 0, on_target: 0, blocked: 0, wide: 0 };
  for (const e of shots) if (e.outcome) counts[e.outcome]++;
  const totalXg = shots.reduce((s, e) => s + (e.xg ?? 0), 0);

  if (shots.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No shot location data available for this side.</p>;
  }

  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
        {shots.length} shots, {totalXg.toFixed(2)} xG. Dot size = xG; color = outcome.
      </p>
      <div className="relative w-full max-w-lg mx-auto rounded-md overflow-hidden" style={{ aspectRatio: "68 / 52.5", background: "#5aa06a" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 68 52.5" preserveAspectRatio="none">
          <HalfPitchMarkings />
          {shots.map((e, i) => {
            const cx = (e.xPct / 100) * 68;
            const cy = 52.5 - (e.yPct / 100) * 52.5;
            const style = e.outcome ? OUTCOME_STYLE[e.outcome] : OUTCOME_STYLE.wide;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={radiusFor(e.xg)} fill={style.fill} fillOpacity={e.outcome === "wide" ? 0.55 : 0.85} stroke="#1f2937" strokeWidth="0.25" />
                <title>
                  #{e.jersey ?? "?"} {e.playerName} — {e.minute}&apos; {e.shotType ?? ""} (xG {e.xg?.toFixed(2) ?? "-"}
                  {e.psxg !== null ? `, PsxG ${e.psxg.toFixed(2)}` : ""})
                </title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-600 dark:text-gray-300">
        {(Object.keys(OUTCOME_STYLE) as (keyof typeof OUTCOME_STYLE)[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: OUTCOME_STYLE[k].fill }} />
            <span>
              {OUTCOME_STYLE[k].label} ({counts[k]})
            </span>
          </div>
        ))}
      </div>
      <ShotTable shots={shots} />
    </div>
  );
}

export function ShotMap({
  homeTeam,
  awayTeam,
  homeShots,
  awayShots,
}: {
  homeTeam: string;
  awayTeam: string;
  homeShots: ShotEntry[];
  awayShots: ShotEntry[];
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
      <TeamShotMap shots={side === "home" ? homeShots : awayShots} />
    </div>
  );
}
