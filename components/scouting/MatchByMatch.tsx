// components/scouting/MatchByMatch.tsx
"use client";
import React, { useState } from "react";
import { MATCH_STATS_BY_TEAM, MatchStatsEntry } from "@/lib/scouting/matchStats";
import { TEAM_SHORT_TO_FULL } from "@/lib/scouting/matchlog";
import { FriendlyMatches } from "./FriendlyMatches";

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500 text-[#0e0e10]",
  D: "bg-gray-500 text-white",
  L: "bg-red-500 text-white",
};

function pct(made: number, attempted: number): string {
  if (!attempted) return "–";
  return `${Math.round((made / attempted) * 1000) / 10}%`;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-gray-200 dark:border-[#2a2b30] last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
    </div>
  );
}

function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 dark:bg-[#14151a] rounded-md p-3">
      <div className="text-[11px] uppercase tracking-wide text-teal-600 dark:text-[#7dd3c0] font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}

function MatchDetail({ entry }: { entry: MatchStatsEntry }) {
  const { possession, shooting, duelDefensive, distribution, discipline, goalkeeping } = entry;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-[#0e0e10]">
      <StatGroup title="Possession">
        <StatRow label="Touches" value={possession.touches} />
        <StatRow label="Unsuccessful Touches" value={possession.unsuccessfulTouches} />
        <StatRow label="Possession Lost" value={possession.possessionLost} />
      </StatGroup>

      <StatGroup title="Shooting">
        <StatRow label="Shots" value={shooting.shots} />
        <StatRow label="On Target" value={`${shooting.shotsOnTarget} (${pct(shooting.shotsOnTarget, shooting.shots)})`} />
        <StatRow label="Off Target" value={shooting.shotsOffTarget} />
        <StatRow label="Blocked" value={shooting.shotsBlocked} />
        <StatRow label="Goals" value={shooting.goals} />
        <StatRow label="xG" value={shooting.xg.toFixed(2)} />
        <StatRow label="Big Chances Missed" value={shooting.bigChancesMissed} />
        <StatRow label="Hit Woodwork" value={shooting.hitWoodwork} />
      </StatGroup>

      <StatGroup title="Duel & Defensive">
        <StatRow label="Duels Won" value={`${duelDefensive.duelsWon} / ${duelDefensive.duelsWon + duelDefensive.duelsLost}`} />
        <StatRow label="Aerial Duels Won" value={`${duelDefensive.aerialDuelsWon} / ${duelDefensive.aerialDuelsWon + duelDefensive.aerialDuelsLost}`} />
        <StatRow label="Tackles Won" value={`${duelDefensive.tacklesWon} / ${duelDefensive.tackles}`} />
        <StatRow label="Interceptions" value={duelDefensive.interceptions} />
        <StatRow label="Ball Recoveries" value={duelDefensive.ballRecoveries} />
        <StatRow label="Clearances" value={duelDefensive.clearances} />
        <StatRow label="Blocked Shots" value={duelDefensive.blockedShots} />
        <StatRow label="Contests Won" value={`${duelDefensive.contestsWon} / ${duelDefensive.contests}`} />
        <StatRow label="Dispossessed" value={duelDefensive.dispossessed} />
        <StatRow label="Errors → Shot" value={duelDefensive.errorsToShot} />
      </StatGroup>

      <StatGroup title="Distribution">
        <StatRow label="Passes" value={`${distribution.accPasses} / ${distribution.passes} (${pct(distribution.accPasses, distribution.passes)})`} />
        <StatRow label="Own Half Passes" value={`${distribution.accOwnHalfPasses} / ${distribution.ownHalfPasses}`} />
        <StatRow label="Opp Half Passes" value={`${distribution.accOppHalfPasses} / ${distribution.oppHalfPasses}`} />
        <StatRow label="Long Balls" value={`${distribution.accLongBalls} / ${distribution.longBalls}`} />
        <StatRow label="Crosses" value={`${distribution.accCrosses} / ${distribution.crosses}`} />
        <StatRow label="Key Passes" value={distribution.keyPasses} />
        <StatRow label="Assists" value={distribution.assists} />
      </StatGroup>

      <StatGroup title="Discipline">
        <StatRow label="Fouls Committed" value={discipline.foulsCommitted} />
        <StatRow label="Fouls Drawn" value={discipline.foulsDrawn} />
        <StatRow label="Offsides" value={discipline.offsides} />
        <StatRow label="Pen. Conceded" value={discipline.penConceded} />
        <StatRow label="Pen. Won" value={discipline.penWon} />
        <StatRow label="Own Goals" value={discipline.ownGoals} />
      </StatGroup>

      {goalkeeping && (
        <StatGroup title="Goalkeeping">
          <StatRow label="Saves" value={goalkeeping.saves} />
          <StatRow label="Saves (Box)" value={goalkeeping.savesBox} />
          <StatRow label="High Claims" value={goalkeeping.highClaims} />
          <StatRow label="Crosses Not Claimed" value={goalkeeping.crossesNotClaimed} />
          <StatRow label="Sweeper Actions" value={`${goalkeeping.accSweeperActions} / ${goalkeeping.sweeperActions}`} />
        </StatGroup>
      )}
    </div>
  );
}

export function MatchByMatch({
  team,
  logoByTeam,
}: {
  team: string;
  logoByTeam?: Record<string, string | null>;
}) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const matches = [...(MATCH_STATS_BY_TEAM[team] ?? [])].sort((a, b) => b.round - a.round);

  return (
    <>
      <FriendlyMatches team={team} />
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-[#2a2b30]">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Match-by-Match</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Click a match to see possession, shooting, duel, passing distribution, and discipline details.
        </p>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-[11px] uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#2a2b30]">
            <th className="text-left p-3">Rd</th>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Opponent</th>
            <th className="text-center p-3">Venue</th>
            <th className="text-center p-3">Score</th>
            <th className="text-center p-3">Result</th>
            <th className="text-center p-3">Rating</th>
            <th className="text-center p-3">xG</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((entry) => {
            const isOpen = expandedRound === entry.round;
            const fullName = TEAM_SHORT_TO_FULL[entry.opponentShort];
            const logoUrl = logoByTeam?.[fullName ?? ""];
            const scoreLabel =
              entry.homeScore === null || entry.awayScore === null
                ? "–"
                : entry.venue === "H"
                ? `${entry.homeScore}–${entry.awayScore}`
                : `${entry.awayScore}–${entry.homeScore}`;

            return (
              <React.Fragment key={entry.round}>
                <tr
                  onClick={() => setExpandedRound(isOpen ? null : entry.round)}
                  className={`border-b border-gray-200 dark:border-[#2a2b30] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202126] ${
                    isOpen ? "bg-gray-100 dark:bg-[#202126]" : ""
                  }`}
                >
                  <td className="p-3 text-gray-500 dark:text-gray-400">{entry.round}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{entry.date}</td>
                  <td className="p-3 flex items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-5 h-5 object-contain" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2a2b30] flex items-center justify-center text-[8px] font-bold text-gray-500 dark:text-gray-400">
                        {entry.opponentShort.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {fullName ?? entry.opponentShort}
                  </td>
                  <td className="p-3 text-center text-gray-500 dark:text-gray-400">{entry.venue}</td>
                  <td className="p-3 text-center font-semibold">{scoreLabel}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-6 rounded text-[11px] font-extrabold py-0.5 ${RESULT_STYLE[entry.result]}`}>
                      {entry.result}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-500 dark:text-gray-400">{entry.avgRating.toFixed(2)}</td>
                  <td className="p-3 text-center text-gray-500 dark:text-gray-400">{entry.shooting.xg.toFixed(2)}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <MatchDetail entry={entry} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
