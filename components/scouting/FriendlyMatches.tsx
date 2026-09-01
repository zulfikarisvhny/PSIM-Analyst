// components/scouting/FriendlyMatches.tsx
import { FRIENDLIES_BY_TEAM } from "@/lib/scouting/friendlies";

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500 text-[#0e0e10]",
  D: "bg-gray-500 text-white",
  L: "bg-red-500 text-white",
};

function formatDate(date: string | null): string {
  if (!date) return "TBC";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function FriendlyMatches({ team }: { team: string }) {
  const matches = FRIENDLIES_BY_TEAM[team];
  if (!matches || matches.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-[#2a2b30]">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Friendlies</h3>
        <p className="text-xs text-gray-500 mt-1">
          Pre-season/friendly matches — separate from official league fixtures below.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-gray-200 dark:divide-[#2a2b30]">
        {matches.map((m) => (
          <div key={m.opponent} className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-gray-700 dark:text-gray-200">vs {m.opponent}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{formatDate(m.date)}</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {m.teamScore}–{m.oppScore}
              </span>
              <span className={`inline-block w-6 text-center rounded text-[11px] font-extrabold py-0.5 ${RESULT_STYLE[m.result]}`}>
                {m.result}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
