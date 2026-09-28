// components/scouting/LeagueStandingsCard.tsx
import type { PsimStandingRow } from "@/lib/scouting/psimStandings";

export function LeagueStandingsCard({ standings, focusTeam }: { standings: PsimStandingRow[]; focusTeam: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[20px] p-5 h-full flex flex-col">
      <h3 className="text-sm font-medium text-[#121b2d] mb-3">BRI Super League 2026/2027</h3>
      <div className="flex-1 overflow-y-auto overflow-x-auto max-h-[260px] -mx-1 px-1">
        <table className="w-full min-w-[360px] text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 sticky top-0 bg-white">
              <th className="text-left font-semibold pb-1.5 w-6">#</th>
              <th className="text-left font-semibold pb-1.5">Club</th>
              <th className="text-center font-semibold pb-1.5 w-7">MP</th>
              <th className="text-center font-semibold pb-1.5 w-7">W</th>
              <th className="text-center font-semibold pb-1.5 w-7">D</th>
              <th className="text-center font-semibold pb-1.5 w-7">L</th>
              <th className="text-center font-semibold pb-1.5 w-9">GD</th>
              <th className="text-center font-semibold pb-1.5 w-9">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const isFocus = row.team === focusTeam;
              return (
                <tr key={row.team} className={`border-b border-gray-100 last:border-b-0 ${isFocus ? "bg-blue-50" : ""}`}>
                  <td className={`py-1.5 ${isFocus ? "font-bold text-[#121b2d]" : "text-gray-500"}`}>{i + 1}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      {row.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.logoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-gray-100 shrink-0" />
                      )}
                      <span className={`truncate ${isFocus ? "font-bold text-[#121b2d]" : "text-gray-700"}`}>{row.team}</span>
                    </div>
                  </td>
                  <td className="text-center py-1.5 text-gray-600">{row.mp}</td>
                  <td className="text-center py-1.5 text-gray-600">{row.w}</td>
                  <td className="text-center py-1.5 text-gray-600">{row.d}</td>
                  <td className="text-center py-1.5 text-gray-600">{row.l}</td>
                  <td className="text-center py-1.5 text-gray-600">
                    {row.goalDiff > 0 ? "+" : ""}
                    {row.goalDiff}
                  </td>
                  <td className={`text-center py-1.5 ${isFocus ? "font-extrabold text-[#121b2d]" : "font-semibold text-gray-700"}`}>{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
