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

/** "21/9" -> just the first (total) number. */
function parseTotal(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/^(\d+)\//);
  return m ? Number(m[1]) : null;
}

/** Average xG per shot, as a % (e.g. 1.87 xG from 15 shots -> 12%) — shot quality, same 0-100 scale as the accuracy donuts. */
function xgPerShotPct(xg: number | null | undefined, shotsRaw: string | undefined): number | null {
  if (xg === null || xg === undefined) return null;
  const totalShots = parseTotal(shotsRaw);
  if (!totalShots) return null;
  return (xg / totalShots) * 100;
}

/** Red at 0%, green at 100% — so a donut's ring color reflects how good the number is, not which side it belongs to. */
function pctToColor(pct: number | null): string {
  if (pct === null) return "#9ca3af"; // gray-400, matches the "—" empty state
  const hue = Math.min(100, Math.max(0, pct)) * 1.2; // 0=red, 120=green
  return `hsl(${hue}, 70%, 45%)`;
}

function PossessionSlider({ pct, color }: { pct: number | null; color: string }) {
  const clamped = pct === null ? 0 : Math.min(100, Math.max(0, pct));
  return (
    <div className="relative pt-6 pb-1 px-1">
      {pct !== null && (
        <span
          className="absolute top-0 -translate-x-1/2 text-[11px] font-bold text-white bg-gray-800 dark:bg-[#0e0e10] rounded px-1.5 py-0.5"
          style={{ left: `${clamped}%` }}
        >
          {Math.round(pct)}
        </span>
      )}
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-[#2a2b30] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  );
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
  homePossessionPct,
  awayPossessionPct,
  homeXg,
  awayXg,
}: {
  homeStats: Record<string, string> | undefined;
  awayStats: Record<string, string> | undefined;
  homePossessionPct?: number | null;
  awayPossessionPct?: number | null;
  homeXg?: number | null;
  awayXg?: number | null;
}) {
  const homeShotAcc = parseRatioPct(homeStats?.["shots_on_target"]);
  const homePassAcc = parseRatioPct(homeStats?.["total_passes_accurate"]);
  const awayShotAcc = parseRatioPct(awayStats?.["shots_on_target"]);
  const awayPassAcc = parseRatioPct(awayStats?.["total_passes_accurate"]);
  const homeXgPerShot = xgPerShotPct(homeXg, homeStats?.["shots_on_target"]);
  const awayXgPerShot = xgPerShotPct(awayXg, awayStats?.["shots_on_target"]);

  return (
    <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-[#2a2b30]">
      <div className="py-3">
        <PossessionSlider pct={homePossessionPct ?? null} color={HOME_COLOR} />
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center -mt-1 mb-2">Possession %</p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-6">
            <Donut pct={homeShotAcc} label="Shot Accuracy" color={pctToColor(homeShotAcc)} />
            <Donut pct={homePassAcc} label="Pass Accuracy" color={pctToColor(homePassAcc)} />
          </div>
          <Donut pct={homeXgPerShot} label="xG per Shot" color={pctToColor(homeXgPerShot)} />
        </div>
      </div>
      <div className="py-3">
        <PossessionSlider pct={awayPossessionPct ?? null} color={AWAY_COLOR} />
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center -mt-1 mb-2">Possession %</p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-6">
            <Donut pct={awayPassAcc} label="Pass Accuracy" color={pctToColor(awayPassAcc)} />
            <Donut pct={awayShotAcc} label="Shot Accuracy" color={pctToColor(awayShotAcc)} />
          </div>
          <Donut pct={awayXgPerShot} label="xG per Shot" color={pctToColor(awayXgPerShot)} />
        </div>
      </div>
    </div>
  );
}
