// components/matchReports/PassCombinationMatrix.tsx
"use client";
import { useState } from "react";

interface PassNetworkPlayer {
  playerId: number;
  name: string;
  totalPasses: number;
}

interface PassNetworkEdge {
  fromPlayerId: number;
  toPlayerId: number;
  fromName: string;
  toName: string;
  passCount: number;
}

interface TeamPassNetwork {
  players: PassNetworkPlayer[];
  edges: PassNetworkEdge[];
}

export function TeamMatrix({ team, teamName }: { team: TeamPassNetwork; teamName: string }) {
  if (team.players.length === 0) {
    return <p className="text-[11px] text-gray-500 dark:text-gray-400">No pass combination data for {teamName}.</p>;
  }

  const passMap = new Map<string, number>();
  for (const e of team.edges) passMap.set(`${e.fromPlayerId}-${e.toPlayerId}`, e.passCount);
  const maxCell = Math.max(...team.edges.map((e) => e.passCount), 1);
  const grandTotal = team.edges.reduce((s, e) => s + e.passCount, 0);
  const topCombos = [...team.edges].sort((a, b) => b.passCount - a.passCount).slice(0, 5);

  function cellBg(count: number) {
    if (!count) return "transparent";
    const t = count / maxCell;
    return `rgba(37, 99, 235, ${0.08 + t * 0.72})`;
  }

  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
        Rows = passer, columns = receiver. {grandTotal} combinations logged (Wyscout only shows pairs with 3 or more
        passes in one direction).
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white dark:bg-[#191a1d] p-1 text-left text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                Passer \ Receiver
              </th>
              {team.players.map((p) => (
                <th key={p.playerId} className="p-1 text-center text-gray-700 dark:text-gray-200 font-semibold whitespace-nowrap">
                  {p.name}
                </th>
              ))}
              <th className="p-1 text-center text-gray-900 dark:text-white font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((rowP) => (
              <tr key={rowP.playerId}>
                <td className="sticky left-0 bg-white dark:bg-[#191a1d] p-1 text-gray-700 dark:text-gray-200 font-semibold whitespace-nowrap border-t border-gray-100 dark:border-[#2a2b30]">
                  {rowP.name}
                </td>
                {team.players.map((colP) => {
                  const isSelf = rowP.playerId === colP.playerId;
                  const count = passMap.get(`${rowP.playerId}-${colP.playerId}`) ?? 0;
                  return (
                    <td
                      key={colP.playerId}
                      className="p-1 text-center border-t border-gray-100 dark:border-[#2a2b30] w-9"
                      style={{ background: isSelf ? "#00000010" : cellBg(count) }}
                    >
                      {isSelf ? (
                        <span className="text-gray-300 dark:text-gray-700">—</span>
                      ) : count ? (
                        <span className={count / maxCell > 0.55 ? "text-white font-bold" : "text-gray-900 dark:text-white font-semibold"}>{count}</span>
                      ) : (
                        <span className="text-gray-200 dark:text-gray-800">·</span>
                      )}
                    </td>
                  );
                })}
                <td className="p-1 text-center font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-[#2a2b30]">{rowP.totalPasses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <div className="text-[11px] font-bold text-gray-900 dark:text-white mb-1.5">Top Combinations</div>
        <div className="flex flex-col gap-1">
          {topCombos.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1.5 text-[11px]"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate">
                {e.fromName} <span className="text-gray-400">→</span> {e.toName}
              </span>
              <span className="font-bold text-gray-900 dark:text-white shrink-0">{e.passCount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PSIM = "PSIM Yogyakarta";

export function PassCombinationMatrix({
  homeTeam,
  awayTeam,
  home,
  away,
}: {
  homeTeam: string;
  awayTeam: string;
  home: TeamPassNetwork;
  away: TeamPassNetwork;
}) {
  const [side, setSide] = useState<"home" | "away">(awayTeam === PSIM ? "away" : "home");
  return (
    <div>
      <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold w-fit mb-3">
        <button
          onClick={() => setSide("home")}
          className={`px-3 py-1.5 ${
            side === "home" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          {homeTeam}
        </button>
        <button
          onClick={() => setSide("away")}
          className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
            side === "away" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          {awayTeam}
        </button>
      </div>
      {side === "home" ? <TeamMatrix team={home} teamName={homeTeam} /> : <TeamMatrix team={away} teamName={awayTeam} />}
    </div>
  );
}
