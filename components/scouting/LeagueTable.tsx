// components/scouting/LeagueTable.tsx
import { LeagueTeamRow } from "@/lib/scouting/types";

export function LeagueTable({
  rows,
  highlight = [],
}: {
  rows: LeagueTeamRow[];
  highlight?: string[]; // team names to highlight, e.g. ["Bhayangkara Presisi FC", "PSIM Yogyakarta"]
}) {
  return (
    <table className="w-full border-collapse bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg overflow-hidden text-sm">
      <thead>
        <tr className="text-[11px] uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#2a2b30]">
          <th className="text-left p-3">#</th>
          <th className="text-left p-3">Team</th>
          <th className="text-center p-3">PL</th>
          <th className="text-center p-3">W</th>
          <th className="text-center p-3">D</th>
          <th className="text-center p-3">L</th>
          <th className="text-center p-3">GD</th>
          <th className="text-center p-3">PTS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const pts = r.W * 3 + r.D;
          const gd = r.goals - r.opp_goals;
          const isHighlighted = highlight.includes(r.Team);
          return (
            <tr
              key={r.Team}
              className={`border-b border-gray-200 dark:border-[#2a2b30] ${
                isHighlighted ? "bg-yellow-400/10" : ""
              }`}
            >
              <td className="p-3 text-center">{i + 1}</td>
              <td className="p-3 flex items-center gap-2">
                {r.logo_url && (
                  <img src={r.logo_url} alt="" className="w-5 h-5 object-contain" />
                )}
                {r.Team}
              </td>
              <td className="p-3 text-center">{r.MP}</td>
              <td className="p-3 text-center">{r.W}</td>
              <td className="p-3 text-center">{r.D}</td>
              <td className="p-3 text-center">{r.L}</td>
              <td className="p-3 text-center">{gd > 0 ? `+${gd}` : gd}</td>
              <td className="p-3 text-center font-bold">{pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
