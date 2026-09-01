// components/scouting/PlayerStats.tsx
"use client";
import { NexusPlayerRow, PositionAverages, PlayerProfileRow } from "@/lib/scouting/players";
import { DefenderRadar } from "./DefenderRadar";
import { PlayerTable } from "./PlayerTable";

export function PlayerStats({
  players,
  teamName,
  leaguePositionAverages,
  leagueDefenderPool,
}: {
  players: NexusPlayerRow[];
  teamName: string;
  leaguePositionAverages: Record<string, PositionAverages>;
  leagueDefenderPool: PlayerProfileRow[];
}) {
  if (players.length === 0) {
    return (
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5 text-sm text-gray-500 dark:text-gray-400">
        No player data for {teamName} in our database yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DefenderRadar teamName={teamName} players={players} leagueDefenderPool={leagueDefenderPool} />

      <PlayerTable players={players} leaguePool={leagueDefenderPool} />
    </div>
  );
}
