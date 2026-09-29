// components/scouting/RealPassNetwork.tsx
"use client";
import { useState } from "react";
import { TeamNetwork } from "@/components/matchReports/PassNetworkPitch";
import { TeamMatrix } from "@/components/matchReports/PassCombinationMatrix";

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

interface TeamPassNetworkEdge {
  fromPlayerId: number;
  toPlayerId: number;
  fromName: string;
  toName: string;
  passCount: number;
}

interface TeamPassNetworkSlice {
  players: TeamPassNetworkPlayer[];
  edges: TeamPassNetworkEdge[];
}

interface TeamPassNetworkMatchSlice extends TeamPassNetworkSlice {
  matchId: number;
  label: string;
}

export function RealPassNetwork({
  teamName,
  matchesUsed,
  overall,
  perMatch,
}: {
  teamName: string;
  matchesUsed: number;
  overall: TeamPassNetworkSlice;
  perMatch: TeamPassNetworkMatchSlice[];
}) {
  const [matchId, setMatchId] = useState<number | "overall">("overall");
  const current = matchId === "overall" ? overall : perMatch.find((m) => m.matchId === matchId) ?? overall;

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-6 flex flex-col gap-6">
      <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold w-fit flex-wrap">
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
      <TeamNetwork network={current} teamName={teamName} />
      <div className="border-t border-gray-200 dark:border-[#2a2b30]" />
      <TeamMatrix team={current} teamName={teamName} />
    </div>
  );
}
