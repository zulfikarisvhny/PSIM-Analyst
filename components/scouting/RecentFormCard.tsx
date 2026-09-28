// components/scouting/RecentFormCard.tsx
import type { RecentMatch } from "@/lib/scouting/recentMatches";

const RESULT_STYLE: Record<RecentMatch["result"], string> = {
  W: "bg-emerald-500 text-[#0e0e10]",
  D: "bg-gray-500 text-white",
  L: "bg-red-500 text-white",
};

function roundLabel(m: RecentMatch): string {
  const n = m.round?.match(/\d+/)?.[0];
  return n ? `Rd ${n}` : new Date(`${m.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function RecentFormCard({ matches }: { matches: RecentMatch[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[20px] p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-medium text-[#121b2d]">Team Form</h3>
        <span className="text-xs text-gray-500">Last {matches.length || 5} matches</span>
      </div>

      {matches.length === 0 ? (
        <p className="text-xs text-gray-500">No completed matches yet.</p>
      ) : (
        <div className="flex gap-3 flex-1 items-center">
          {matches
            .slice()
            .reverse()
            .map((m) => (
              <div key={m.matchId} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="text-[10px] text-gray-500">{roundLabel(m)}</div>
                <div className={`w-full text-center rounded-md py-2 font-extrabold text-base ${RESULT_STYLE[m.result]}`}>
                  {m.goalsFor}–{m.goalsAgainst}
                </div>
                {m.opponentLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.opponentLogoUrl} alt={m.opponent} title={m.opponent} className="w-6 h-6 object-contain" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500"
                    title={m.opponent}
                  >
                    {m.opponent.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
