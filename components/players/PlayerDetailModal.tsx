// components/players/PlayerDetailModal.tsx
"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { PsimPlayerRow, percentileRank, getMetricValue } from "@/lib/scouting/psimPlayerTypes";
import { BUCKET_METRIC_GROUPS, positionBucketOf, WYSCOUT_POSITION_BUCKETS } from "@/lib/scouting/psimPlayerMetrics";
import { PlayerPizzaChart } from "@/components/scouting/PlayerPizzaChart";

function barColor(pct: number) {
  if (pct >= 70) return "#34d399";
  if (pct >= 40) return "#fbbf24";
  return "#f87171";
}

function StatRow({
  label,
  value,
  decimals,
  suffix,
  percentile,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
  percentile: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-44 shrink-0 text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="w-16 shrink-0 text-sm font-mono font-bold text-gray-900 dark:text-white">
        {value.toFixed(decimals)}
        {suffix ?? ""}
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] overflow-hidden relative">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, percentile)}%`, backgroundColor: barColor(percentile) }} />
      </div>
      <div className="w-8 shrink-0 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">{Math.round(percentile)}</div>
    </div>
  );
}

export function PlayerDetailModal({
  player,
  leaguePool,
  onClose,
}: {
  player: PsimPlayerRow | null;
  leaguePool: PsimPlayerRow[];
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!player) return;
    const html = document.documentElement;
    const originalHtml = html.style.overflow;
    const originalBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = originalHtml;
      document.body.style.overflow = originalBody;
    };
  }, [player]);

  if (!player) return null;

  const bucket = positionBucketOf(player.position);
  const positions = bucket ? WYSCOUT_POSITION_BUCKETS[bucket] ?? [] : [];
  const pool = leaguePool.filter((r) => positions.includes((r.position ?? "").split(",")[0].trim().toUpperCase()));
  const groups = bucket ? BUCKET_METRIC_GROUPS[bucket] ?? [] : [];

  const computedGroups = groups.map((group) => ({
    title: group.title,
    color: group.color,
    items: group.metrics.map((metric) => {
      const value = getMetricValue(player, metric.key) ?? 0;
      const poolValues = pool
        .map((r) => getMetricValue(r, metric.key))
        .filter((v): v is number => v !== null);
      const rawPercentile = percentileRank(poolValues, value);
      return {
        key: metric.key,
        label: metric.label,
        value,
        decimals: metric.decimals,
        suffix: metric.suffix,
        percentile: metric.invert ? 100 - rawPercentile : rawPercentile,
      };
    }),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-[#2a2b30]">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{player.player}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {player.team} · {player.position ?? "—"}
              {player.age !== null ? ` · ${player.age}y` : ""}
              {typeof player.stats.foot === "string" ? ` · ${player.stats.foot} foot` : ""}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {player.matches_played ?? 0} apps · {player.minutes_played ?? 0}&apos; · {player.goals ?? 0} goals ·{" "}
              {player.assists ?? 0} assists
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl leading-none px-2" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col md:flex-row gap-6 md:max-h-[70vh]">
          {(pool.length === 0 || groups.length === 0) && (
            <p className="text-xs text-gray-500 md:hidden">
              {groups.length === 0 ? "Unrecognized position — no comparison template yet." : "No league pool for this position yet — percentiles default to 50."}
            </p>
          )}

          {groups.length > 0 && (
            <div className="md:sticky md:top-0">
              <PlayerPizzaChart groups={computedGroups} />
            </div>
          )}

          <div className="flex flex-col gap-6 md:flex-1 md:overflow-y-auto md:pr-1">
            {(pool.length === 0 || groups.length === 0) && (
              <p className="text-xs text-gray-500 hidden md:block">
                {groups.length === 0 ? "Unrecognized position — no comparison template yet." : "No league pool for this position yet — percentiles default to 50."}
              </p>
            )}
            {computedGroups.map((group) => (
              <div key={group.title}>
                <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: isDark ? group.color.dark : group.color.light }}>
                  {group.title}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-[#2a2b30]">
                  {group.items.map((item) => (
                    <StatRow key={item.key} label={item.label} value={item.value} decimals={item.decimals} suffix={item.suffix} percentile={item.percentile} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
