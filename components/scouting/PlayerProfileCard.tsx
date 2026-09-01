// components/scouting/PlayerProfileCard.tsx
"use client";
import { useState } from "react";
import { KEY_METRICS } from "@/lib/keyMetrics";
import { NexusPlayerRow, PlayerProfileRow, overallQualityScore, positionBucketOf } from "@/lib/scouting/players";
import { PlayerDetailModal } from "./PlayerDetailModal";

export function ratingColor(score: number) {
  if (score >= 60) return "#34d399"; // emerald
  if (score >= 40) return "#fbbf24"; // amber
  return "#f87171"; // red
}

function RatingBar({ score }: { score: number | null }) {
  if (score === null) return null;
  const topPct = Math.max(1, Math.round(100 - score));
  const color = ratingColor(score);
  return (
    <div className="mb-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">In-League Rating</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-extrabold" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-gray-500">Top {topPct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] overflow-hidden mt-1.5">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function PlayerStatLine({ player }: { player: NexusPlayerRow }) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 border-y border-gray-200 dark:border-[#2a2b30] py-2 my-2">
      <span>
        <b className="text-gray-900 dark:text-white">{player.matches_played}</b> apps
      </span>
      <span>
        <b className="text-gray-900 dark:text-white">{player.minutes_played}</b> mins
      </span>
      <span>
        <b className="text-gray-900 dark:text-white">{player.goals}</b> goals
      </span>
      <span>
        <b className="text-gray-900 dark:text-white">{player.assists}</b> assists
      </span>
    </div>
  );
}

function TopMetrics({ player, bucket }: { player: NexusPlayerRow; bucket: string | null }) {
  if (!bucket) return null;
  const metrics = KEY_METRICS[bucket].slice().sort((a, b) => b.weight - a.weight).slice(0, 3);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      {metrics.map((m) => {
        const v = player[m.key];
        return (
          <span key={m.key}>
            {m.label}: <b className="text-gray-700 dark:text-gray-200">{typeof v === "number" ? v.toFixed(1) : "—"}</b>
          </span>
        );
      })}
    </div>
  );
}

export function PlayerProfileCard({
  player,
  subtitle,
  leaguePool,
}: {
  player: NexusPlayerRow;
  subtitle: string;
  leaguePool: PlayerProfileRow[];
}) {
  const bucket = positionBucketOf(player.position_group);
  const score = overallQualityScore(player, bucket, leaguePool);
  const color = score !== null ? ratingColor(score) : "#2a2b30";
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg overflow-hidden cursor-pointer hover:border-blue-600/40 dark:hover:border-[#ffcf4d]/40"
      >
        <div className="h-1" style={{ backgroundColor: color }} />
        <div className="p-4">
          <div className="text-sm font-bold text-gray-900 dark:text-white">{player.player_name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{subtitle}</div>
          <RatingBar score={score} />
          <PlayerStatLine player={player} />
          <TopMetrics player={player} bucket={bucket} />
        </div>
      </div>
      {open && (
        <PlayerDetailModal player={player} leaguePool={leaguePool} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
