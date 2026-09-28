// components/matchReports/AccuracyDonuts.tsx
"use client";

const HOME_COLOR = "#2563eb";
const AWAY_COLOR = "#f97316"; // matches this browser's existing home/away convention

/** "21/9" (total/on-target, or total/accurate) -> the second number's share of the first, as a %. */
function parseRatioPct(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/^(\d+)\/(\d+)/);
  if (!m) return null;
  const total = Number(m[1]);
  const part = Number(m[2]);
  if (total === 0) return null;
  return (part / total) * 100;
}

function Donut({ pct, label, color }: { pct: number | null; label: string; color: string }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const filled = pct === null ? 0 : (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-gray-100 dark:text-[#2a2b30]" />
        {pct !== null && (
          <circle
            cx="52"
            cy="52"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
            transform="rotate(-90 52 52)"
          />
        )}
        <text x="52" y="52" textAnchor="middle" dominantBaseline="central" fontSize="21" fontWeight="700" className="fill-gray-900 dark:fill-white">
          {pct === null ? "—" : `${Math.round(pct)}%`}
        </text>
      </svg>
      <span className="text-xs text-gray-500 dark:text-gray-400 text-center whitespace-nowrap">{label}</span>
    </div>
  );
}

export function AccuracyDonuts({
  homeStats,
  awayStats,
}: {
  homeStats: Record<string, string> | undefined;
  awayStats: Record<string, string> | undefined;
}) {
  const homeShotAcc = parseRatioPct(homeStats?.["shots_on_target"]);
  const homePassAcc = parseRatioPct(homeStats?.["total_passes_accurate"]);
  const awayShotAcc = parseRatioPct(awayStats?.["shots_on_target"]);
  const awayPassAcc = parseRatioPct(awayStats?.["total_passes_accurate"]);

  return (
    <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-[#2a2b30]">
      <div className="flex items-center justify-center gap-6 py-3">
        <Donut pct={homeShotAcc} label="Shot Accuracy" color={HOME_COLOR} />
        <Donut pct={homePassAcc} label="Pass Accuracy" color={HOME_COLOR} />
      </div>
      <div className="flex items-center justify-center gap-6 py-3">
        <Donut pct={awayPassAcc} label="Pass Accuracy" color={AWAY_COLOR} />
        <Donut pct={awayShotAcc} label="Shot Accuracy" color={AWAY_COLOR} />
      </div>
    </div>
  );
}
