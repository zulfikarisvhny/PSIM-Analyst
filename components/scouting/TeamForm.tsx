// components/scouting/TeamForm.tsx
import { LeagueTeamRow } from "@/lib/scouting/types";
import { MATCH_LOG_BY_TEAM, OWN_SHORT_BY_TEAM, TEAM_SHORT_TO_FULL, opponentOf } from "@/lib/scouting/matchlog";

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500 text-[#0e0e10]",
  D: "bg-gray-500 text-white",
  L: "bg-red-500 text-white",
};

export function TeamForm({ rows, teamName }: { rows: LeagueTeamRow[]; teamName: string }) {
  const ownShort = OWN_SHORT_BY_TEAM[teamName] ?? teamName;
  const recent = (MATCH_LOG_BY_TEAM[teamName] ?? []).slice(-5);

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Team Form</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">Last 5 matches</span>
      </div>
      <div className="flex gap-3 flex-1 items-center">
        {recent.map((entry) => {
          const { opponentShort, teamScore, oppScore } = opponentOf(entry, ownShort);
          const fullName = TEAM_SHORT_TO_FULL[opponentShort];
          const logoUrl = rows.find((r) => r.Team === fullName)?.logo_url;
          const scoreLabel = teamScore === null || oppScore === null ? "–" : `${teamScore}–${oppScore}`;

          return (
            <div key={entry.round} className="flex flex-col items-center gap-1.5 flex-1">
              <div className="text-[10px] text-gray-500">Rd {entry.round}</div>
              <div className={`w-full text-center rounded-md py-2 font-extrabold text-base ${RESULT_STYLE[entry.result]}`}>
                {scoreLabel}
              </div>
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2a2b30] flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-gray-400">
                  {opponentShort.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight">
                vs {opponentShort}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
