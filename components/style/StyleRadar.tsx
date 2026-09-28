// components/style/StyleRadar.tsx
"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { TeamStyleRow } from "@/lib/scouting/psimStyleStats";
import { STYLE_METRICS, percentileRank, metricValue } from "@/lib/scouting/teamStyleMetrics";

const PSIM = "PSIM Yogyakarta";
// Same palette as the Points Progression chart, for visual consistency.
const CURRENT_COLOR = "#3E63B4";
const LAST_COLOR = "#EC6A3B";
const BACK_BG = "#122957";

const KEY_TRAITS: { label: string; icon: string; good: boolean }[] = [
  { label: "Possession", icon: "🔄", good: true },
  { label: "Pass Accuracy", icon: "🎯", good: true },
  { label: "Shot Quality (xG/Shot)", icon: "⚽", good: false },
  { label: "Proactive Defending", icon: "🛡️", good: false },
];

function average(pool: number[]): number | null {
  return pool.length ? pool.reduce((a, b) => a + b, 0) / pool.length : null;
}

export function StyleRadar({ rows }: { rows: TeamStyleRow[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [compareWith, setCompareWith] = useState<string>(""); // "" = League Average
  const [flipped, setFlipped] = useState(false);

  const psimRow = rows.find((r) => r.clubName === PSIM);
  const otherTeams = rows.filter((r) => r.clubName !== PSIM).sort((a, b) => a.clubName.localeCompare(b.clubName));
  const compareRow = otherTeams.find((r) => r.clubName === compareWith);
  const compareLabel = compareRow ? compareRow.clubName : "League Average";

  if (!psimRow) {
    return (
      <div className="h-full bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5">
        <p className="text-xs text-gray-500 dark:text-gray-400">No team_style_stats row for PSIM Yogyakarta yet.</p>
      </div>
    );
  }

  const chartData = STYLE_METRICS.map((m) => {
    const pool = rows.map((r) => metricValue(r, m.key)).filter((v): v is number => typeof v === "number");
    const psimValue = metricValue(psimRow, m.key);
    const compareValue = compareRow ? metricValue(compareRow, m.key) : average(pool);
    return {
      metric: m.label,
      PSIM: psimValue !== null ? percentileRank(pool, psimValue) : 50,
      psimRaw: psimValue,
      Compare: compareValue !== null ? percentileRank(pool, compareValue) : null,
      compareRaw: compareValue,
      suffix: m.suffix ?? "",
      decimals: m.decimals,
    };
  });

  const gridColor = isDark ? "#2a2b30" : "#e5e7eb";
  const textColor = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div className="h-full" style={{ perspective: 1400 }}>
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/style-logo.png" alt="" className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Playing Style</h3>
                <p className="text-[11px] text-gray-400">Percentile vs League</p>
              </div>
            </div>
            <button type="button" onClick={() => setFlipped(true)} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/arrow-button.png" alt="Show PSIM style summary" className="w-6 h-6" />
            </button>
          </div>
          <div className="mb-3">
            <select
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1 text-xs text-gray-900 dark:text-white"
            >
              <option value="">League Average</option>
              {otherTeams.map((t) => (
                <option key={t.clubId} value={t.clubName}>
                  {t.clubName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="75%">
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: textColor, fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
                <Radar name="PSIM Yogyakarta" dataKey="PSIM" stroke={CURRENT_COLOR} fill={CURRENT_COLOR} fillOpacity={0.35} />
                <Radar name={compareLabel} dataKey="Compare" stroke={LAST_COLOR} fill={LAST_COLOR} fillOpacity={0.25} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: isDark ? "#191a1d" : "#fff", border: `1px solid ${gridColor}`, fontSize: 12 }}
                  formatter={(value, name, props) => {
                    const isPsim = props.dataKey === "PSIM";
                    const raw = isPsim ? props.payload.psimRaw : props.payload.compareRaw;
                    const suffix = props.payload.suffix;
                    const decimals = props.payload.decimals;
                    return [`${raw !== null ? raw.toFixed(decimals) : "—"}${suffix} (percentile ${value})`, isPsim ? "PSIM Yogyakarta" : compareLabel];
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-lg px-8 py-5 flex flex-col text-white"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: BACK_BG }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/meaning-logo.png" alt="" className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-normal text-white">PSIM Style</h3>
            </div>
            <button type="button" onClick={() => setFlipped(false)} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/arrow-button.png" alt="Back to chart" className="w-6 h-6" style={{ filter: "brightness(0) invert(1)" }} />
            </button>
          </div>

          <p className="text-xs font-normal text-white/80 leading-relaxed mb-5">
            PSIM tends to build its game around possession from the back, with passing accuracy above the BRI Super League average — but its chance
            quality and proactive defending fall short.
          </p>

          <div className="text-[9px] font-normal tracking-wide text-white/50 mb-2">KEY STATS</div>
          <div className="flex flex-col gap-2">
            {KEY_TRAITS.map((trait) => {
              const row = chartData.find((c) => c.metric === trait.label);
              if (!row || row.psimRaw === null) return null;
              return (
                <div
                  key={trait.label}
                  className={`flex items-center justify-between gap-2 rounded-full px-3.5 py-2 text-[11px] font-normal ${
                    trait.good ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{trait.icon}</span>
                    {trait.label}
                  </span>
                  <span>
                    {row.psimRaw.toFixed(row.decimals)}
                    {row.suffix}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4 text-[11px] font-normal text-white/60 leading-relaxed">
            A possession-heavy side that controls games through the back — sharpening its end product and pressing intensity would close the gap to
            the league&apos;s best.
          </div>
        </div>
      </div>
    </div>
  );
}
