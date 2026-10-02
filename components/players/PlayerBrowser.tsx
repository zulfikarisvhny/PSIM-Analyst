// components/players/PlayerBrowser.tsx
"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PsimPlayerRow } from "@/lib/scouting/psimPlayerTypes";
import { positionBucketOf } from "@/lib/scouting/psimPlayerMetrics";

export function PlayerBrowser({ players }: { players: PsimPlayerRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => players.filter((p) => p.player.toLowerCase().includes(query.toLowerCase())),
    [players, query]
  );

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search player name..."
        className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white w-64 outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d] mb-4"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => {
          const bucket = positionBucketOf(p.position);
          return (
            <Link
              key={p.playerId}
              href={`/players/${p.playerId}`}
              className="text-left bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-4 hover:border-blue-400 dark:hover:border-[#ffcf4d] transition-colors flex items-center gap-3"
            >
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2a2b30] flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                  {p.player.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.player}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {bucket ?? p.position ?? "—"} · {p.age ?? "—"}y
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {p.matches_played ?? 0} apps · {p.minutes_played ?? 0}&apos; · {p.goals ?? 0}g · {p.assists ?? 0}a
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No players found.</p>}
    </div>
  );
}
