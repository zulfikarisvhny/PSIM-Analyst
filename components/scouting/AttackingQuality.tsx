// components/scouting/AttackingQuality.tsx
import { LeagueTeamRow } from "@/lib/scouting/types";

function leagueAvg(rows: LeagueTeamRow[], key: (r: LeagueTeamRow) => number) {
  return rows.reduce((s, r) => s + key(r), 0) / rows.length;
}

function rankOf(rows: LeagueTeamRow[], key: (r: LeagueTeamRow) => number, focusTeam: string) {
  const sorted = rows.slice().sort((a, b) => key(b) - key(a));
  return sorted.findIndex((r) => r.Team === focusTeam) + 1;
}

// Bullet-style mini bar: fills to `value` on a [min,max] track, with a tick at `avg`.
function CompareBar({
  value,
  avg,
  min,
  max,
  signed,
  decimals = 2,
}: {
  value: number;
  avg: number;
  min: number;
  max: number;
  signed?: boolean;
  decimals?: number;
}) {
  const span = max - min || 1;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / span) * 100));
  const valuePct = pct(value);
  const avgPct = pct(avg);
  const zeroPct = pct(0);
  const fillLeft = signed ? Math.min(zeroPct, valuePct) : 0;
  const fillWidth = signed ? Math.abs(valuePct - zeroPct) : valuePct;
  const fillColor = signed ? (value >= 0 ? "bg-emerald-400" : "bg-red-400") : "bg-blue-600 dark:bg-[#ffcf4d]";

  return (
    <div className="relative h-1.5 rounded-full bg-gray-200 dark:bg-[#2a2b30] mt-3 mb-1">
      <div
        className={`absolute top-0 h-full rounded-full ${fillColor}`}
        style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
      />
      <div
        className="absolute -top-1 w-0.5 h-3.5 bg-gray-300 rounded-full"
        style={{ left: `${avgPct}%` }}
        title={`League average: ${avg.toFixed(decimals)}`}
      />
    </div>
  );
}

// 100%-stacked distribution bar — one row, N segments, direct-labeled shares.
function DistributionBar({
  label,
  segments,
}: {
  label: string;
  segments: { label: string; value: number; color: string; textColor: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</div>
      <div className="flex w-full h-7 gap-0.5">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.label}
              className="flex items-center justify-center rounded-sm text-[11px] font-semibold first:rounded-l-md last:rounded-r-md"
              style={{ width: `${pct}%`, backgroundColor: seg.color, color: seg.textColor }}
              title={`${seg.label}: ${seg.value} (${pct.toFixed(1)}%)`}
            >
              {pct >= 10 ? `${pct.toFixed(0)}%` : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Horizontal ranked bar — single measure across categories, sorted by caller.
function RankBar({ label, value, max, total }: { label: string; value: number; max: number; total: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 text-xs text-gray-500 dark:text-gray-400 shrink-0 truncate" title={label}>
        {label}
      </div>
      <div className="flex-1 h-5 rounded-md bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] overflow-hidden">
        <div
          className="h-full rounded-md bg-blue-600 dark:bg-[#ffcf4d]"
          style={{ width: `${pct}%`, minWidth: value > 0 ? 6 : 0 }}
        />
      </div>
      <div className="w-28 text-right text-xs text-gray-600 dark:text-gray-300 shrink-0">
        {value} goals <span className="text-gray-500">({share.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

export function AttackingQuality({
  rows,
  focusTeam,
  hasMatchLog,
}: {
  rows: LeagueTeamRow[];
  focusTeam: string;
  hasMatchLog: boolean;
}) {
  const focusRow = rows.find((r) => r.Team === focusTeam);
  if (!focusRow) return null;

  // openPlayBreakdown/setPieceSummary below are hand-read off MidBlock filter
  // screenshots, not derived from the season-aggregate table — only ever
  // transcribed for Bhayangkara, so gate those two sections to it specifically.
  const isBhayangkara = focusTeam === "Bhayangkara Presisi FC";

  const goalsPerMatch = focusRow.goals / focusRow.MP;
  const xgPerMatch = focusRow.xg / focusRow.MP;
  const xgPerShot = focusRow.xg / focusRow.shots;
  const finishingDiff = focusRow.goals - focusRow.xg;

  const tileDef = (
    label: string,
    key: (r: LeagueTeamRow) => number,
    opts?: { decimals?: number; signed?: boolean }
  ) => {
    const values = rows.map(key);
    return {
      label,
      value: key(focusRow),
      rank: rankOf(rows, key, focusTeam),
      avg: leagueAvg(rows, key),
      min: Math.min(...values, 0),
      max: Math.max(...values, 0),
      decimals: opts?.decimals,
      signed: opts?.signed,
    };
  };

  const tiles = [
    tileDef("Goals / Match", (r) => r.goals / r.MP),
    tileDef("xG / Match", (r) => r.xg / r.MP),
    tileDef("xG / Shot", (r) => r.xg / r.shots, { decimals: 3 }),
    tileDef("Goals − xG (Season)", (r) => r.goals - r.xg, { signed: true }),
  ];

  const shotSummary = [
    { label: "Shots", value: focusRow.shots },
    { label: "Goals", value: focusRow.goals },
    { label: "On Target", value: focusRow.shots_on_target },
    { label: "Total xG", value: focusRow.xg.toFixed(2) },
    { label: "Avg xG / Shot", value: xgPerShot.toFixed(3) },
  ];

  // Open-play shots only, split by box location — read off MidBlock filters
  // (Bhayangkara-specific, not derivable from the season-aggregate table).
  const openPlayBreakdown = [
    { label: "Inside The Box", shots: 155, goals: 29, onTarget: 59, totalXg: 27.48, avgXg: 0.177 },
    { label: "Outside The Box", shots: 98, goals: 1, onTarget: 18, totalXg: 2.69, avgXg: 0.027 },
  ];
  const insideSharePct =
    (openPlayBreakdown[0].shots / (openPlayBreakdown[0].shots + openPlayBreakdown[1].shots)) * 100;
  const leagueAvgXgPerShot = leagueAvg(rows, (r) => r.xg / r.shots);

  // Set-piece (dead-ball) shots — read off MidBlock filters, same as above.
  const setPieceSummary = { shots: 127, goals: 16, onTarget: 48, totalXg: 15.19, avgXg: 0.12 };
  const setPieceByType = [
    { label: "Corner", goals: 5 },
    { label: "Set Piece", goals: 6 },
  ];
  const setPieceOtherGoals = setPieceSummary.goals - setPieceByType.reduce((s, t) => s + t.goals, 0);
  const setPieceTypesFull = [
    ...setPieceByType,
    ...(setPieceOtherGoals > 0 ? [{ label: "Other (direct free kick/throw-in)", goals: setPieceOtherGoals }] : []),
  ].sort((a, b) => b.goals - a.goals);
  const maxSetPieceType = Math.max(...setPieceTypesFull.map((t) => t.goals), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t.label}</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t.signed && t.value >= 0 ? "+" : ""}
              {t.value.toFixed(t.decimals ?? 2)}
            </div>
            <CompareBar
              value={t.value}
              avg={t.avg}
              min={t.min}
              max={t.max}
              signed={t.signed}
              decimals={t.decimals ?? 2}
            />
            <div className="text-xs text-gray-500">
              Rank {t.rank}/{rows.length} in league · avg {t.avg.toFixed(t.decimals ?? 2)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">This Season&apos;s Shooting Summary</h3>
        <p className="text-xs text-gray-500 mb-4">
          No shot location map (shot placement) yet — this requires per-shot data (coordinates + xG for each
          shot) that isn&apos;t available in this project yet.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {shotSummary.map((s) => (
            <div key={s.label}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {hasMatchLog && isBhayangkara && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Open Play: Inside vs Outside The Box</h3>
          <p className="text-xs text-gray-500 mb-4">
            Open-play shots only (excluding set pieces/penalties) — broken down by shot location.
          </p>

          <div className="flex flex-col gap-3 mb-3">
            <DistributionBar
              label="Shot Distribution"
              segments={[
                { label: "Inside The Box", value: openPlayBreakdown[0].shots, color: "#ffcf4d", textColor: "#14151a" },
                { label: "Outside The Box", value: openPlayBreakdown[1].shots, color: "#4f8fe0", textColor: "#ffffff" },
              ]}
            />
            <DistributionBar
              label="Goal Distribution"
              segments={[
                { label: "Inside The Box", value: openPlayBreakdown[0].goals, color: "#ffcf4d", textColor: "#14151a" },
                { label: "Outside The Box", value: openPlayBreakdown[1].goals, color: "#4f8fe0", textColor: "#ffffff" },
              ]}
            />
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#ffcf4d" }} /> Inside The Box
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#4f8fe0" }} /> Outside The Box
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Takeaway: <b className="text-gray-900 dark:text-white">{insideSharePct.toFixed(0)}%</b> of {focusTeam}&apos;s open-play shots
            are taken from <b className="text-gray-900 dark:text-white">inside the penalty box</b>, and their quality (avg xG/shot{" "}
            <b className="text-blue-600 dark:text-[#ffcf4d]">{openPlayBreakdown[0].avgXg}</b>) is well above the overall league
            average (<b className="text-gray-900 dark:text-white">{leagueAvgXgPerShot.toFixed(3)}</b>) — a sign there&apos;s a player
            able to break through the opposition&apos;s defensive line to create clear-cut chances in dangerous areas, not just
            relying on speculative long-range shots. In contrast, shots from{" "}
            <b className="text-gray-900 dark:text-white">outside the box</b> ({openPlayBreakdown[1].shots} attempts) convert at just{" "}
            <b className="text-red-500 dark:text-red-400">
              {((openPlayBreakdown[1].goals / openPlayBreakdown[1].shots) * 100).toFixed(1)}%
            </b>{" "}
            (avg xG/shot {openPlayBreakdown[1].avgXg}) — these shots likely come when build-up play stalls and
            players are forced to shoot from distance because they can&apos;t find a way through to the box.
          </p>
        </div>
      )}

      {hasMatchLog && isBhayangkara && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Set Pieces (Dead Ball)</h3>
          <p className="text-xs text-gray-500 mb-4">
            Corners, free kicks, and other dead-ball situations (excluding penalties).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shots</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">{setPieceSummary.shots}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Goals</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">{setPieceSummary.goals}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">On Target</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">{setPieceSummary.onTarget}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total xG</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">{setPieceSummary.totalXg}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg xG / Shot</div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-white">{setPieceSummary.avgXg}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-[#2a2b30]">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">Set-piece goals by type</div>
            <div className="flex flex-col gap-2.5">
              {setPieceTypesFull.map((t) => (
                <RankBar key={t.label} label={t.label} value={t.goals} max={maxSetPieceType} total={setPieceSummary.goals} />
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
            Set pieces contributed <b className="text-gray-900 dark:text-white">{setPieceSummary.goals}</b> of{" "}
            <b className="text-gray-900 dark:text-white">{focusRow.goals}</b> goals this season (
            {((setPieceSummary.goals / focusRow.goals) * 100).toFixed(0)}%) — <b className="text-gray-900 dark:text-white">corners</b>{" "}
            (5 goals) and <b className="text-gray-900 dark:text-white">direct free kicks</b> (6 goals) are the two biggest sources.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        This season {focusTeam} has scored <b className="text-gray-900 dark:text-white">{focusRow.goals} goals</b> from a total of{" "}
        <b className="text-gray-900 dark:text-white">{focusRow.xg.toFixed(1)} xG</b> —{" "}
        {finishingDiff >= 0 ? (
          <>
            <b className="text-emerald-600 dark:text-emerald-400">overperforming by +{finishingDiff.toFixed(1)}</b>, a sign of{" "}
            <b className="text-gray-900 dark:text-white">clinical</b> finishing: converting chances better than the quality of
            chances actually created.
          </>
        ) : (
          <>
            <b className="text-red-500 dark:text-red-400">underperforming by {finishingDiff.toFixed(1)}</b>, a sign of plenty of good
            chances going to waste.
          </>
        )}{" "}
        Chance quality per shot (xG/Shot <b className="text-gray-900 dark:text-white">{xgPerShot.toFixed(3)}</b>) is{" "}
        {xgPerShot >= leagueAvg(rows, (r) => r.xg / r.shots) ? "above" : "below"} the league average (
        {leagueAvg(rows, (r) => r.xg / r.shots).toFixed(3)}
        ).
      </div>
    </div>
  );
}
