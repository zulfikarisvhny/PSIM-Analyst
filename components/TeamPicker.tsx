// components/TeamPicker.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TeamPicker({ teams }: { teams: string[] }) {
  const router = useRouter();
  const [team, setTeam] = useState(teams[0] ?? "");

  function go() {
    if (team) router.push(`/scouting/${encodeURIComponent(team)}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        className="flex-1 bg-white dark:bg-[#191a1d] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-4 py-3 text-sm outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
      >
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        onClick={go}
        className="bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] font-bold text-sm rounded-md px-6 py-3 hover:brightness-95"
      >
        Open Scouting Report
      </button>
    </div>
  );
}
