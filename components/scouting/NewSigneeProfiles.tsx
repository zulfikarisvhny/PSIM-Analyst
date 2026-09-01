// components/scouting/NewSigneeProfiles.tsx
// Generic (per-team) new-signee profile list — lighter than SquadUpdate.tsx,
// which additionally covers departed players and a repositioning analysis
// that only exist as hand-written scouting notes for Bhayangkara.
import { NexusPlayerRow, PlayerProfileRow } from "@/lib/scouting/players";
import { NewSigneeInput } from "@/lib/scouting/newSignees";
import { PlayerProfileCard } from "./PlayerProfileCard";

const POSITION_GROUP_LABELS: Record<string, string> = {
  CF: "Centre-Forward",
  LW: "Left Winger",
  RW: "Right Winger",
  AM: "Attacking Midfielder",
  CM: "Central Midfielder",
  DM: "Defensive Midfielder",
  RB: "Right-Back",
  LB: "Left-Back",
  CB: "Centre-Back",
  GK: "Goalkeeper",
};

export function NewSigneeProfiles({
  teamName,
  signees,
  players,
  leaguePool,
}: {
  teamName: string;
  signees: NewSigneeInput[];
  players: NexusPlayerRow[];
  leaguePool: PlayerProfileRow[];
}) {
  const findPlayer = (name: string) => players.find((p) => p.player_name === name);

  const withData = signees.filter((s) => s.nexusName && findPlayer(s.nexusName));
  const withoutData = signees.filter((s) => !s.nexusName || !findPlayer(s.nexusName));

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{teamName} New Signings</h3>
        <p className="text-xs text-gray-500">
          Current lineup needs to be verified before matchday — some of the data below still reflects performance at
          their previous club, not at {teamName}.
        </p>
      </div>

      {withData.length > 0 && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Full Stats Available</h3>
          <p className="text-xs text-gray-500 mb-4">
            Stats are from their previous club — used as a profile snapshot, not a guarantee of the same output in
            Liga 1 with {teamName}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {withData.map((s) => {
              const player = findPlayer(s.nexusName!)!;
              const posLabel = POSITION_GROUP_LABELS[s.positionGroup] ?? s.positionGroup;
              // Skip "eks <club>" when the player's Nexus row is already
              // tagged to this team itself (e.g. academy graduates) — that
              // text would misleadingly imply they left and came back.
              const origin = s.note ?? (player.team !== teamName ? `ex-${player.team}` : null);
              return (
                <PlayerProfileCard
                  key={s.name}
                  player={player}
                  subtitle={origin ? `${posLabel} · ${origin}` : posLabel}
                  leaguePool={leaguePool}
                />
              );
            })}
          </div>
        </div>
      )}

      {withoutData.length > 0 && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Data Yet</h3>
          <p className="text-xs text-gray-500 mb-4">
            Not yet recorded in our database — likely from a league/level not currently tracked.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {withoutData.map((s) => (
              <div key={s.name} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {POSITION_GROUP_LABELS[s.positionGroup] ?? s.positionGroup}
                      {s.note && ` · ${s.note}`}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                    No data
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
