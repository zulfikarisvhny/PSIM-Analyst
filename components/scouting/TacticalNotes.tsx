// components/scouting/TacticalNotes.tsx
import { ReactNode } from "react";
import { LeagueTeamRow } from "@/lib/scouting/types";
import { SQUAD_UPDATE_WARNING } from "@/lib/scouting/squadUpdate";

function rankOf(rows: LeagueTeamRow[], key: (r: LeagueTeamRow) => number, focusTeam: string, ascending = false) {
  const sorted = rows.slice().sort((a, b) => (ascending ? key(a) - key(b) : key(b) - key(a)));
  return sorted.findIndex((r) => r.Team === focusTeam) + 1;
}

function leagueAvg(rows: LeagueTeamRow[], key: (r: LeagueTeamRow) => number) {
  return rows.reduce((s, r) => s + key(r), 0) / rows.length;
}

function NoteSection({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#191a1d] rounded-lg p-5 border-l-2" style={{ borderColor: accent }}>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="flex flex-col gap-2.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

function Point({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-blue-600 dark:text-[#ffcf4d] shrink-0">•</span>
      <p>{children}</p>
    </div>
  );
}

export function TacticalNotes({
  rows,
  focusTeam,
  focusRow,
  teamRank,
  teamPoints,
}: {
  rows: LeagueTeamRow[];
  focusTeam: string;
  focusRow: LeagueTeamRow | undefined;
  teamRank: number;
  teamPoints: number;
}) {
  if (!focusRow) return null;

  const passAccRank = rankOf(rows, (r) => r["Pass Acc %"], focusTeam);
  const passAccAvg = leagueAvg(rows, (r) => r["Pass Acc %"]);
  const finishingDiff = focusRow.goals - focusRow.xg;
  const goalsPerMatch = focusRow.goals / focusRow.MP;
  const xgPerMatch = focusRow.xg / focusRow.MP;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Team Summary</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <b className="text-gray-900 dark:text-white">{focusTeam}</b> — Ranked <b className="text-gray-900 dark:text-white">{teamRank}</b> with{" "}
          <b className="text-gray-900 dark:text-white">{teamPoints} points</b>. Playing style: <b className="text-gray-900 dark:text-white">{focusRow.Style}</b>,
          with a <b className="text-gray-900 dark:text-white">{focusRow.Defense}</b> defensive approach. Team passing accuracy{" "}
          <b className="text-gray-900 dark:text-white">{focusRow["Pass Acc %"].toFixed(1)}%</b> — ranked{" "}
          <b className={passAccRank >= rows.length - 2 ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white"}>
            {passAccRank}/{rows.length}
          </b>{" "}
          in the league (league average {passAccAvg.toFixed(1)}%).
        </p>
      </div>

      <NoteSection title="Key Threats" accent="#ef6a6a">
        <Point>
          <b className="text-gray-900 dark:text-white">M. Sidibé</b> — the squad's most productive winger, with goals/90 and xG/90 running roughly 3-4x
          the league average for an RW/LW, plus double the average dribble volume. He's the biggest individual threat, but
          the danger extends across the entire attacking unit, not just the winger.
        </Point>
        <Point>
          Ball progression relies more on <b className="text-gray-900 dark:text-white">direct long balls from the back line</b>{" "}
          (Damjanović from center-back, Putu Gede & Andika from full-back) than short build-up through midfield —
          watch for quick switches of play out to the flanks.
        </Point>
        <Point>
          The team's finishing has <b className={finishingDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
            {finishingDiff >= 0 ? "overperformed" : "underperformed"} xG ({finishingDiff >= 0 ? "+" : ""}
            {finishingDiff.toFixed(1)})
          </b>{" "}
          this season ({goalsPerMatch.toFixed(2)} goals/match vs {xgPerMatch.toFixed(2)} xG/match) — clinical in front of goal,
          don't give them free chances.
        </Point>
      </NoteSection>

      <NoteSection title="Exploitable Weaknesses" accent="#34d399">
        <Point>
          <b className="text-gray-900 dark:text-white">Worst (or near-worst) passing accuracy in the league</b> — sustained high pressing
          could force turnovers, especially through midfield.
        </Point>
        <Point>
          The midfield (particularly the holding/box-to-box types) is <b className="text-gray-900 dark:text-white">duel-heavy and foul-prone</b>,
          with passing quality below the league average almost across the board — physical pressure in the middle third could
          draw fouls (set-piece opportunities) or force turnovers.
        </Point>
        <Point>
          The squad is in a transitional period — several key players have just left and some new signings have no
          track record at this level yet, so defensive cohesion may not be fully settled (see details in the{" "}
          <b className="text-gray-900 dark:text-white">Squad Update</b> tab).
        </Point>
      </NoteSection>

      <div className="bg-blue-50 dark:bg-[#2b2410] border border-blue-200 dark:border-[#7a6a33] rounded-lg p-5">
        <div className="text-xs font-bold text-blue-600 dark:text-[#ffcf4d] mb-1">SQUAD NOTE</div>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{SQUAD_UPDATE_WARNING}</p>
      </div>

      <NoteSection title="Suggested Game Plan" accent="#4f8fe0">
        <Point>
          Mark <b className="text-gray-900 dark:text-white">Sidibé</b> tightly when he cuts inside from the flank — he frequently shows up
          in central areas, not just out wide.
        </Point>
        <Point>
          Anticipate long balls/switches of play from <b className="text-gray-900 dark:text-white">Damjanović, Gede, and Andika</b> — stay
          compact out wide so they can't be easily exploited by direct long passes.
        </Point>
        <Point>
          Press high on Bhayangkara's midfield to exploit their weak passing accuracy — expect physical
          contact since they're duel-heavy, but that also creates set-piece opportunities from the fouls they concede.
        </Point>
        <Point>
          Verify the current lineup before matchday — if any new signings (Ristovski, Allano, or Y. Putra)
          are starting, their data profiles have already been compared in the Squad Update tab.
        </Point>
      </NoteSection>
    </div>
  );
}
