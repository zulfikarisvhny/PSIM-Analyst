// app/players/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPsimPlayerPool } from "@/lib/scouting/psimPlayers";
import { computePlayerComparison } from "@/lib/scouting/psimPlayerMetrics";
import { PlayerRadarChart } from "@/components/players/PlayerRadarChart";
import { DashboardPageShell } from "@/components/DashboardPageShell";

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
      <div className="w-48 shrink-0 text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
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

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const pool = await fetchPsimPlayerPool();
  const player = pool.find((p) => p.playerId === Number(params.id));
  if (!player) notFound();

  const { bucket, pool: positionPool, groups, computedGroups } = computePlayerComparison(player, pool);

  return (
    <DashboardPageShell
      title={player.player}
      description={
        <Link href="/players" className="text-blue-600 dark:text-[#ffcf4d] hover:underline">
          &larr; Back to players
        </Link>
      }
    >
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 flex items-center gap-4 mb-6">
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2a2b30] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
            {player.player.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{player.player}</div>
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
      </div>

      {(positionPool.length === 0 || groups.length === 0) && (
        <p className="text-xs text-gray-500 mb-6">
          {groups.length === 0 ? "Unrecognized position — no comparison template yet." : "No league pool for this position yet — percentiles default to 50."}
        </p>
      )}

      {groups.length > 0 && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 mb-6">
          <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">Radar</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {player.player} vs. the league&apos;s {bucket} pool
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Compared against every player in the league whose primary position buckets into {bucket} ({positionPool.length} players).
          </p>
          <PlayerRadarChart groups={computedGroups} playerName={player.player} />
        </div>
      )}

      {computedGroups.length > 0 && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 flex flex-col gap-6">
          {computedGroups.map((group) => (
            <div key={group.title}>
              <div
                className="text-xs font-bold uppercase tracking-wide mb-1"
                style={{ color: group.color.light }}
              >
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
      )}
    </DashboardPageShell>
  );
}
