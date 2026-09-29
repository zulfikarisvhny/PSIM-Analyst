// components/scouting/ScoutingTabs.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LeagueTeamRow, RadarPercentiles } from "@/lib/scouting/types";
import { NexusPlayerRow, PositionAverages, PlayerProfileRow } from "@/lib/scouting/players";
import { NewSigneeInput } from "@/lib/scouting/newSignees";
import { DEPARTED_PLAYERS_BY_TEAM } from "@/lib/scouting/departedPlayers";
import { LeagueTable } from "./LeagueTable";
import { StyleMap } from "./StyleMap";
import { RadarComparison } from "./RadarComparison";
import { QuickStats } from "./QuickStats";
import { TeamForm } from "./TeamForm";
import { HeadToHead } from "./HeadToHead";
import { FormationPitchCard } from "./FormationPitch";
import { FormationMatrix } from "./FormationMatrix";
import { AveragePosition } from "./AveragePosition";
import { TacticsBoard } from "./TacticsBoard";
import { PassNetwork } from "./PassNetwork";
import { RealPassNetwork } from "./RealPassNetwork";
import { RealAveragePosition } from "./RealAveragePosition";
import { PASS_NETWORK_BY_TEAM } from "@/lib/scouting/passNetwork";
import type { TeamPassNetworkResult } from "@/lib/scouting/teamPassNetworkFromReports";
import { AttackingQuality } from "./AttackingQuality";
import { PlayerStats } from "./PlayerStats";
import { SquadUpdate } from "./SquadUpdate";
import { NewSigneeProfiles } from "./NewSigneeProfiles";
import { DepartedPlayers } from "./DepartedPlayers";
import { TacticalNotes } from "./TacticalNotes";
import { MatchByMatch } from "./MatchByMatch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function ScoutingTabs({
  rows,
  percentiles,
  focusTeam,
  teamOptions,
  hasMatchLog,
  hasSquadNotes,
  hasNewSignees,
  formationSignees,
  focusRow,
  teamRank,
  teamPoints,
  players,
  formationPlayers,
  leaguePositionAverages,
  leagueDefenderPool,
  incomingPlayers,
  realPassNetwork,
}: {
  rows: LeagueTeamRow[];
  percentiles: Record<string, RadarPercentiles>;
  focusTeam: string;
  teamOptions: string[];
  hasMatchLog: boolean;
  hasSquadNotes: boolean;
  hasNewSignees: boolean;
  formationSignees: NewSigneeInput[];
  focusRow: LeagueTeamRow | undefined;
  teamRank: number;
  teamPoints: number;
  players: NexusPlayerRow[];
  formationPlayers: NexusPlayerRow[];
  leaguePositionAverages: Record<string, PositionAverages>;
  incomingPlayers: NexusPlayerRow[];
  leagueDefenderPool: PlayerProfileRow[];
  realPassNetwork: TeamPassNetworkResult | null;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  const passNetworkMatches = PASS_NETWORK_BY_TEAM[focusTeam];
  const hasRealPassNetwork = (realPassNetwork?.overall.players.length ?? 0) > 0;

  const TABS = [
    { id: "overview", label: "Overview", active: true },
    { id: "table", label: "Table", active: true },
    { id: "players", label: "Player Stats", active: true },
    { id: "stylemap", label: "Style Map", active: true },
    { id: "formation", label: "Formation Analysis", active: hasMatchLog },
    { id: "avgpos", label: "Average Position", active: hasMatchLog || hasRealPassNetwork },
    { id: "passnetwork", label: "Passing Network", active: !!passNetworkMatches || hasRealPassNetwork },
    { id: "tacticsboard", label: "Tactics Board", active: true },
    { id: "matchstats", label: "Match-by-Match", active: hasMatchLog },
    { id: "attack", label: "Attack", active: true },
    { id: "squad", label: "Squad Update", active: hasNewSignees },
    { id: "notes", label: "Tactical Notes", active: hasSquadNotes },
  ];

  return (
    <div>
      <div className="bg-white dark:bg-[#191a1d] rounded-lg px-7 pt-6 border border-gray-200 dark:border-transparent">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-[#ffcf4d] mb-3"
        >
          ← All Teams
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-blue-200 dark:border-[#7a6a33] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-[#2b2410] dark:to-[#463813] flex items-center justify-center overflow-hidden shrink-0">
              {focusRow?.logo_url ? (
                <img src={focusRow.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 dark:text-[#ffcf4d] font-extrabold text-sm">
                  {focusTeam.split(" ").map((w) => w[0]).slice(0, 3).join("")}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{focusTeam}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">BRI Super League</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-[#2a2b30] text-gray-500 dark:text-gray-400">
              Rank {teamRank} · {teamPoints} Pts
            </span>
            <span className="text-xs px-3.5 py-1.5 rounded-full border border-blue-200 dark:border-[#7a6a33] bg-blue-50 dark:bg-[#ffcf4d]/10 text-blue-600 dark:text-[#ffcf4d] font-bold">
              Next Opponent: PSIM
            </span>
            <select
              value={focusTeam}
              onChange={(e) => router.push(`/scouting/${encodeURIComponent(e.target.value)}`)}
              className="text-xs font-semibold bg-white dark:bg-[#191a1d] text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-2.5 py-1.5 outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
            >
              {rows.map((r) => (
                <option key={r.Team} value={r.Team}>
                  {r.Team}
                </option>
              ))}
            </select>
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex gap-7 border-t border-gray-200 dark:border-[#2a2b30] overflow-x-auto">
          {TABS.map((t) =>
            t.active ? (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`text-sm font-semibold py-3.5 border-b-[3px] whitespace-nowrap ${
                  activeTab === t.id
                    ? "text-gray-900 dark:text-white border-blue-600 dark:border-[#ffcf4d]"
                    : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:border-blue-600 dark:hover:border-[#ffcf4d]"
                }`}
              >
                {t.label}
              </button>
            ) : (
              <span
                key={t.id}
                title="Coming soon"
                className="text-sm font-semibold text-gray-400 dark:text-gray-600 py-3.5 whitespace-nowrap cursor-not-allowed"
              >
                {t.label}
              </span>
            )
          )}
        </nav>
      </div>

      <div className="mt-10">
        {activeTab === "overview" && (
          <div>
            <QuickStats rows={rows} focusTeam={focusTeam} />
            <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-6 mt-8">
              <RadarComparison
                rows={rows}
                percentiles={percentiles}
                focusTeam={focusTeam}
                teamOptions={teamOptions}
              />
            </div>
          </div>
        )}

        {activeTab === "table" && (
          <div>
            {hasMatchLog && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <TeamForm rows={rows} teamName={focusTeam} />
                <HeadToHead focusTeam={focusTeam} opponentTeam="PSIM" />
              </div>
            )}
            <h2 className="text-xl font-bold mb-4">Standings</h2>
            <LeagueTable rows={rows} highlight={[focusTeam, "PSIM Yogyakarta"]} />
          </div>
        )}

        {activeTab === "stylemap" && (
          <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-6">
            <StyleMap rows={rows} focusTeam={focusTeam} compareTeam="PSIM Yogyakarta" />
          </div>
        )}

        {activeTab === "formation" && hasMatchLog && (
          <div className="flex flex-col gap-4">
            <FormationPitchCard teamName={focusTeam} logoUrl={focusRow?.logo_url} players={formationPlayers} />
            <FormationMatrix teamName={focusTeam} />
          </div>
        )}

        {activeTab === "avgpos" && (
          hasRealPassNetwork && realPassNetwork ? (
            <RealAveragePosition
              teamName={focusTeam}
              matchesUsed={realPassNetwork.matchesUsed}
              overallPlayers={realPassNetwork.overall.players}
              perMatch={realPassNetwork.perMatch}
            />
          ) : (
            hasMatchLog && <AveragePosition teamName={focusTeam} logoUrl={focusRow?.logo_url} />
          )
        )}

        {activeTab === "passnetwork" && (
          hasRealPassNetwork && realPassNetwork ? (
            <RealPassNetwork
              teamName={focusTeam}
              matchesUsed={realPassNetwork.matchesUsed}
              overall={realPassNetwork.overall}
              perMatch={realPassNetwork.perMatch}
            />
          ) : (
            passNetworkMatches && <PassNetwork teamName={focusTeam} matches={passNetworkMatches} />
          )
        )}

        {activeTab === "tacticsboard" && (
          <TacticsBoard teamName={focusTeam} players={players} />
        )}

        {activeTab === "matchstats" && hasMatchLog && (
          <MatchByMatch team={focusTeam} logoByTeam={Object.fromEntries(rows.map((r) => [r.Team, r.logo_url]))} />
        )}

        {activeTab === "attack" && (
          <AttackingQuality rows={rows} focusTeam={focusTeam} hasMatchLog={hasMatchLog} />
        )}

        {activeTab === "players" && (
          <PlayerStats
            players={players}
            teamName={focusTeam}
            leaguePositionAverages={leaguePositionAverages}
            leagueDefenderPool={leagueDefenderPool}
          />
        )}

        {activeTab === "squad" && (
          hasSquadNotes ? (
            <SquadUpdate players={players} leaguePool={leagueDefenderPool} incomingPlayers={incomingPlayers} />
          ) : (
            <div className="flex flex-col gap-6">
              <NewSigneeProfiles
                teamName={focusTeam}
                signees={formationSignees}
                players={formationPlayers}
                leaguePool={leagueDefenderPool}
              />
              <DepartedPlayers teamName={focusTeam} list={DEPARTED_PLAYERS_BY_TEAM[focusTeam] ?? []} />
            </div>
          )
        )}

        {activeTab === "notes" && (
          <TacticalNotes rows={rows} focusTeam={focusTeam} focusRow={focusRow} teamRank={teamRank} teamPoints={teamPoints} />
        )}
      </div>
    </div>
  );
}
