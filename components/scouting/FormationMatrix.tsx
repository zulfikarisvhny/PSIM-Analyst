// components/scouting/FormationMatrix.tsx
import { MATCH_LOG_BY_TEAM, OWN_SHORT_BY_TEAM, opponentOf } from "@/lib/scouting/matchlog";

interface CellMatch {
  round: number;
  opponentShort: string;
  teamScore: number | null;
  oppScore: number | null;
  result: "W" | "D" | "L";
}

interface Cell {
  played: number;
  w: number;
  matches: CellMatch[];
}

const RESULT_COLOR: Record<string, string> = {
  W: "text-emerald-600 dark:text-emerald-400",
  D: "text-gray-600 dark:text-gray-300",
  L: "text-red-500 dark:text-red-400",
};

export function FormationMatrix({ teamName }: { teamName: string }) {
  const matchLog = MATCH_LOG_BY_TEAM[teamName] ?? [];
  const ownShort = OWN_SHORT_BY_TEAM[teamName] ?? teamName;
  const matrix = new Map<string, Map<string, Cell>>();
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();
  const colWins = new Map<string, number>();

  for (const entry of matchLog) {
    const { teamFormation, oppFormation, opponentShort, teamScore, oppScore } = opponentOf(entry, ownShort);
    if (!matrix.has(teamFormation)) matrix.set(teamFormation, new Map());
    const rowMap = matrix.get(teamFormation)!;
    const cell = rowMap.get(oppFormation) ?? { played: 0, w: 0, matches: [] };
    cell.played += 1;
    if (entry.result === "W") cell.w += 1;
    cell.matches.push({ round: entry.round, opponentShort, teamScore, oppScore, result: entry.result });
    rowMap.set(oppFormation, cell);
    rowTotals.set(teamFormation, (rowTotals.get(teamFormation) ?? 0) + 1);
    colTotals.set(oppFormation, (colTotals.get(oppFormation) ?? 0) + 1);
    colWins.set(oppFormation, (colWins.get(oppFormation) ?? 0) + (entry.result === "W" ? 1 : 0));
  }

  const rows = Array.from(rowTotals.keys()).sort((a, b) => rowTotals.get(b)! - rowTotals.get(a)!);
  const cols = Array.from(colTotals.keys()).sort((a, b) => colTotals.get(b)! - colTotals.get(a)!);

  let max = 0;
  for (const r of rows) for (const c of cols) max = Math.max(max, matrix.get(r)?.get(c)?.played ?? 0);

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Formation vs Opponent Formation</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        Rows = <b className="text-gray-600 dark:text-gray-300">{teamName}</b>&apos;s formation · Columns ={" "}
        <b className="text-gray-600 dark:text-gray-300">opponent</b> formation · Each cell: number of matches & {teamName}&apos;s win
        percentage. Hover over a cell to see match details.
      </p>

      <div className="flex gap-3">
        <div className="flex items-center justify-center shrink-0">
          <span
            className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {teamName} Formation
          </span>
        </div>

        <div className="flex-1">
          <table className="w-full" style={{ tableLayout: "fixed", borderSpacing: 3, borderCollapse: "separate" }}>
            <colgroup>
              <col style={{ width: "90px" }} />
              {cols.map((c) => (
                <col key={c} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="pr-3" />
                {cols.map((c) => (
                  <th key={c} className="text-[11px] text-gray-500 dark:text-gray-400 font-mono font-normal px-1 pb-2 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r}>
                  <td className="text-xs text-gray-600 dark:text-gray-300 font-mono font-bold pr-3 whitespace-nowrap text-right">{r}</td>
                  {cols.map((c) => {
                    const cell = matrix.get(r)?.get(c);
                    const played = cell?.played ?? 0;
                    const winPct = played > 0 ? Math.round((cell!.w / played) * 100) : null;
                    const opacity = played === 0 ? 0 : 0.15 + (played / max) * 0.85;
                    return (
                      <td
                        key={c}
                        className="relative h-14 text-center align-middle rounded-md group"
                        style={{
                          background: played ? `rgba(94, 171, 156, ${opacity})` : "transparent",
                          border: played ? "none" : "1px solid #2a2b30",
                        }}
                      >
                        {played > 0 && (
                          <>
                            <div className="leading-tight cursor-default">
                              <div className="text-base font-semibold text-gray-900 dark:text-white">{played}</div>
                              <div className="text-[11px] text-gray-700 dark:text-gray-200/80">{winPct}% W</div>
                            </div>

                            <div className="hidden group-hover:block absolute z-20 top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-3 text-left shadow-xl">
                              <div className="text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 whitespace-nowrap">
                                {r} vs {c}
                              </div>
                              <div className="flex flex-col gap-1">
                                {cell!.matches.map((m) => (
                                  <div key={m.round} className="flex justify-between items-center gap-2 text-[11px]">
                                    <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                      Rd {m.round} vs {m.opponentShort}
                                    </span>
                                    <span className={`font-mono font-semibold ${RESULT_COLOR[m.result]}`}>
                                      {m.teamScore === null || m.oppScore === null ? "–" : `${m.teamScore}–${m.oppScore}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold pr-3 text-right whitespace-nowrap pt-3">
                  Win Rate
                </td>
                {cols.map((c) => {
                  const total = colTotals.get(c)!;
                  const wins = colWins.get(c) ?? 0;
                  const pct = Math.round((wins / total) * 100);
                  return (
                    <td key={c} className="text-center align-middle pt-3">
                      <div className="inline-flex flex-col items-center leading-tight">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span>
                        <span className="text-[10px] text-gray-500">{total}x</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>

          <div className="text-center text-xs text-gray-500 dark:text-gray-400 font-semibold mt-3">Opponent Formation</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 text-xs text-gray-500 dark:text-gray-400">
        <span>Rare</span>
        <span
          className="w-24 h-2 rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(94,171,156,0.15), rgba(94,171,156,1))" }}
        />
        <span>Common</span>
      </div>
    </div>
  );
}
