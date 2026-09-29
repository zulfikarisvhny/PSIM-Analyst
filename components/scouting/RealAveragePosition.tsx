// components/scouting/RealAveragePosition.tsx
"use client";
import { useState } from "react";
import { TeamNetwork } from "@/components/matchReports/PassNetworkPitch";

interface TeamPassNetworkPlayer {
  playerId: number;
  name: string;
  totalPasses: number;
  defThirdPct: number | null;
  midThirdPct: number | null;
  finalThirdPct: number | null;
  xPct: number | null;
  yPct: number | null;
  jersey: number | null;
}

interface TeamPassNetworkMatchSlice {
  matchId: number;
  label: string;
  players: TeamPassNetworkPlayer[];
}

export function RealAveragePosition({
  teamName,
  matchesUsed,
  overallPlayers,
  perMatch,
}: {
  teamName: string;
  matchesUsed: number;
  overallPlayers: TeamPassNetworkPlayer[];
  perMatch: TeamPassNetworkMatchSlice[];
}) {
  const [matchId, setMatchId] = useState<number | "overall">("overall");
  const players = matchId === "overall" ? overallPlayers : perMatch.find((m) => m.matchId === matchId)?.players ?? overallPlayers;

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-6">
      <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold w-fit flex-wrap mb-3">
        <button
          onClick={() => setMatchId("overall")}
          className={`px-3 py-1.5 ${
            matchId === "overall" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          Overall ({matchesUsed})
        </button>
        {perMatch.map((m) => (
          <button
            key={m.matchId}
            onClick={() => setMatchId(m.matchId)}
            className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
              matchId === m.matchId ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <TeamNetwork network={{ players, edges: [] }} teamName={teamName} mode="positions" />
    </div>
  );
}
