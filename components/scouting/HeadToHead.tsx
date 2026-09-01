// components/scouting/HeadToHead.tsx
import { MATCH_LOG_BY_TEAM, OWN_SHORT_BY_TEAM, opponentOf } from "@/lib/scouting/matchlog";

export function HeadToHead({ focusTeam, opponentTeam }: { focusTeam: string; opponentTeam: string }) {
  const matchLog = MATCH_LOG_BY_TEAM[focusTeam] ?? [];
  const ownShort = OWN_SHORT_BY_TEAM[focusTeam] ?? focusTeam;
  const matches = matchLog.filter((e) => opponentOf(e, ownShort).opponentShort === opponentTeam);

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Head-to-Head vs {opponentTeam}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">2025/26 Season</span>
      </div>
      <div className="flex flex-col divide-y divide-gray-200 dark:divide-[#2a2b30]">
        {matches.map((entry) => {
          const { opponentShort, venue, teamScore, oppScore } = opponentOf(entry, ownShort);
          const won = entry.result === "W";
          const drew = entry.result === "D";
          const scoreLabel =
            teamScore === null || oppScore === null
              ? "–"
              : venue === "H"
              ? `${teamScore}–${oppScore}`
              : `${oppScore}–${teamScore}`;
          return (
            <div key={entry.round} className="flex justify-between items-center py-2.5 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Rd {entry.round}</div>
                <div className="text-gray-600 dark:text-gray-300">
                  {venue === "H" ? `${focusTeam} vs ${opponentShort}` : `${opponentShort} vs ${focusTeam}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-extrabold text-lg text-gray-900 dark:text-white">{scoreLabel}</div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    drew
                      ? "bg-gray-500/20 text-gray-600 dark:text-gray-300"
                      : won
                      ? "bg-blue-50 dark:bg-[#ffcf4d]/20 text-blue-600 dark:text-[#ffcf4d]"
                      : "bg-[#4f8fe0]/20 text-[#4f8fe0]"
                  }`}
                >
                  {drew ? "Draw" : won ? `${focusTeam} Win` : `${opponentTeam} Win`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
