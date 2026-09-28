// components/style/StyleComparison.tsx
"use client";
import type { TeamStyleRow } from "@/lib/scouting/psimStyleStats";
import { StyleRadar } from "./StyleRadar";
import { StyleScatter } from "./StyleScatter";

export function StyleComparison({ rows }: { rows: TeamStyleRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 text-sm text-gray-500 dark:text-gray-400">
        No team_style_stats data yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 items-stretch">
      <StyleRadar rows={rows} />
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 flex flex-col">
        <StyleScatter rows={rows} />
      </div>
    </div>
  );
}
