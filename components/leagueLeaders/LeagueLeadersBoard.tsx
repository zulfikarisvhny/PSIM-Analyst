// components/leagueLeaders/LeagueLeadersBoard.tsx
"use client";
import { useMemo, useState } from "react";
import { STAT_CATEGORIES, POSITION_BUCKETS, type LeagueLeaderRawRow, type StatGroup, type PositionBucket } from "@/lib/scouting/leagueLeadersCategories";

const GROUPS: StatGroup[] = ["Attacking", "Creating", "Passing", "Defending", "Dribbling & Duels", "Goalkeeping", "Discipline"];

function fmt(v: number, decimals: number, suffix?: string): string {
  return `${v.toFixed(decimals)}${suffix ?? ""}`;
}

// Dots are stacked into value bins (a dot histogram) so "the field" reads as
// a distribution rather than a loose scatter — the same shape Wyscout's own
// "where the ten sit" graphic uses.
const BIN_COUNT = 36;
const DOT_R = 3.6;
const DOT_GAP = 1.4;
const CHART_WIDTH = 760;
const CHART_HEIGHT = 220;
const AXIS_PAD_BOTTOM = 28;
const AXIS_PAD_TOP = 10;

const selectClass = "bg-white border border-gray-200 rounded-md px-2 py-1.5 text-xs font-semibold text-gray-700";

type Nationality = "all" | "local" | "foreign";

/** Two overlapping native range inputs sharing one track — the standard dependency-free dual-handle slider. */
function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const span = Math.max(1, max - min);
  const thumbClass =
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow";

  return (
    <div className="relative h-4">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-blue-600"
        style={{ left: `${((valueMin - min) / span) * 100}%`, right: `${100 - ((valueMax - min) / span) * 100}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={valueMin}
        onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
        className={`absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none ${thumbClass}`}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={valueMax}
        onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
        className={`absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none ${thumbClass}`}
      />
    </div>
  );
}

export function LeagueLeadersBoard({ players }: { players: LeagueLeaderRawRow[] }) {
  const [categoryKey, setCategoryKey] = useState(STAT_CATEGORIES[0].key);
  const category = STAT_CATEGORIES.find((c) => c.key === categoryKey)!;

  const ageBounds = useMemo(() => {
    const ages = players.map((p) => p.age).filter((a): a is number => a !== null);
    return { min: ages.length ? Math.min(...ages) : 16, max: ages.length ? Math.max(...ages) : 45 };
  }, [players]);
  const minutesBounds = useMemo(() => {
    const minutes = players.map((p) => p.minutesPlayed);
    return { min: 0, max: minutes.length ? Math.max(...minutes) : 1000 };
  }, [players]);

  const [ageRange, setAgeRange] = useState<[number, number]>([ageBounds.min, ageBounds.max]);
  const [minutesRange, setMinutesRange] = useState<[number, number]>([50, minutesBounds.max]);
  const [nationality, setNationality] = useState<Nationality>("all");
  const [positions, setPositions] = useState<Set<PositionBucket>>(new Set());

  function togglePosition(bucket: PositionBucket) {
    setPositions((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  }

  function clearAll() {
    setAgeRange([ageBounds.min, ageBounds.max]);
    setMinutesRange([50, minutesBounds.max]);
    setNationality("all");
    setPositions(new Set());
  }

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (p.age !== null && (p.age < ageRange[0] || p.age > ageRange[1])) return false;
      if (p.minutesPlayed < minutesRange[0] || p.minutesPlayed > minutesRange[1]) return false;
      if (nationality === "local" && p.isLocal !== true) return false;
      if (nationality === "foreign" && p.isLocal !== false) return false;
      if (positions.size > 0 && (!p.positionBucket || !positions.has(p.positionBucket as PositionBucket))) return false;
      return true;
    });
  }, [players, ageRange, minutesRange, nationality, positions]);

  const ranked = useMemo(() => {
    return filteredPlayers
      .map((p) => ({ player: p, value: category.compute(p) }))
      .filter((r): r is { player: LeagueLeaderRawRow; value: number } => r.value !== null && r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredPlayers, category]);

  const top10 = ranked.slice(0, 10);
  const top10Ids = new Set(top10.map((r) => r.player.playerId));

  const maxValue = Math.max(1, ...ranked.map((r) => r.value));
  const median = ranked.length > 0 ? ranked[Math.floor(ranked.length / 2)].value : 0;
  const binWidth = maxValue / BIN_COUNT;

  const dots = useMemo(() => {
    const plotWidth = CHART_WIDTH;
    const binHeights = new Array(BIN_COUNT + 1).fill(0);
    return ranked.map((r) => {
      const bin = binWidth > 0 ? Math.min(BIN_COUNT, Math.floor(r.value / binWidth)) : 0;
      const stack = binHeights[bin]++;
      const x = (bin / BIN_COUNT) * plotWidth + (plotWidth / BIN_COUNT) * 0.5;
      const y = CHART_HEIGHT - AXIS_PAD_BOTTOM - stack * (DOT_R * 2 + DOT_GAP) - DOT_R;
      return { id: r.player.playerId, x, y, isTop10: top10Ids.has(r.player.playerId) };
    });
  }, [ranked, binWidth, top10Ids]);

  const axisTicks = useMemo(() => {
    const step = maxValue <= 10 ? 2 : maxValue <= 50 ? 10 : Math.ceil(maxValue / 5 / 10) * 10;
    const ticks: number[] = [];
    for (let v = 0; v <= maxValue; v += step) ticks.push(v);
    return ticks;
  }, [maxValue]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">Stat</label>
        <select value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)} className={selectClass}>
          {GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {STAT_CATEGORIES.filter((c) => c.group === group).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-[#121b2d]">Age Range</p>
            <p className="text-[11px] text-gray-400 mb-3">
              {ageRange[0]} – {ageRange[1]} years old
            </p>
            <RangeSlider min={ageBounds.min} max={ageBounds.max} valueMin={ageRange[0]} valueMax={ageRange[1]} onChange={(a, b) => setAgeRange([a, b])} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#121b2d]">Minutes Played</p>
            <p className="text-[11px] text-gray-400 mb-3">
              {minutesRange[0]} – {minutesRange[1]} min
            </p>
            <RangeSlider
              min={minutesBounds.min}
              max={minutesBounds.max}
              valueMin={minutesRange[0]}
              valueMax={minutesRange[1]}
              onChange={(a, b) => setMinutesRange([a, b])}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-[#121b2d] mb-2">Nationality</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["all", "All players"],
                ["local", "Local"],
                ["foreign", "Foreign"],
              ] as [Nationality, string][]
            ).map(([n, label]) => (
              <button
                key={n}
                type="button"
                onClick={() => setNationality(n)}
                className={`text-xs font-semibold rounded-lg border px-3 py-2 text-center ${
                  nationality === n ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-[#121b2d] mb-2">Position</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${POSITION_BUCKETS.length + 1}, minmax(0, 1fr))` }}>
            <button
              type="button"
              onClick={() => setPositions(new Set())}
              className={`text-xs font-semibold rounded-lg border px-3 py-2 ${
                positions.size === 0 ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              All
            </button>
            {POSITION_BUCKETS.map((bucket) => (
              <button
                key={bucket}
                type="button"
                onClick={() => togglePosition(bucket)}
                className={`text-xs font-semibold rounded-lg border px-3 py-2 ${
                  positions.has(bucket) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {bucket}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
            Clear All
          </button>
          <a href="#league-leaders-results" className="text-xs font-bold bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700">
            See {ranked.length} player{ranked.length === 1 ? "" : "s"}
          </a>
        </div>
      </div>

      <div id="league-leaders-results" className="scroll-mt-6">
        {ranked.length === 0 ? (
          <p className="text-sm text-gray-500">No qualifying players for this filter.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">The field</p>
              <h3 className="text-xl font-extrabold text-[#121b2d] mb-3">Where the ten sit.</h3>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} width="100%" height={CHART_HEIGHT} className="min-w-[500px]">
                  {/* Median line */}
                  <line
                    x1={(median / maxValue) * CHART_WIDTH}
                    x2={(median / maxValue) * CHART_WIDTH}
                    y1={AXIS_PAD_TOP}
                    y2={CHART_HEIGHT - AXIS_PAD_BOTTOM}
                    stroke="#d1d5db"
                    strokeDasharray="3,3"
                    strokeWidth={1}
                  />
                  <text x={(median / maxValue) * CHART_WIDTH} y={AXIS_PAD_TOP - 2} fontSize={9} fill="#9ca3af" textAnchor="middle">
                    Median {median.toFixed(category.decimals)}
                  </text>

                  {/* Dots: the whole field in light gray, top 10 in dark */}
                  {dots.map((d) => (
                    <circle key={d.id} cx={d.x} cy={d.y} r={DOT_R} fill={d.isTop10 ? "#121b2d" : "#d9dce3"} />
                  ))}

                  {/* Axis */}
                  <line x1={0} x2={CHART_WIDTH} y1={CHART_HEIGHT - AXIS_PAD_BOTTOM} y2={CHART_HEIGHT - AXIS_PAD_BOTTOM} stroke="#e5e7eb" strokeWidth={1} />
                  {axisTicks.map((t) => (
                    <text key={t} x={(t / maxValue) * CHART_WIDTH} y={CHART_HEIGHT - AXIS_PAD_BOTTOM + 14} fontSize={9} fill="#9ca3af" textAnchor="middle">
                      {t}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">The top ten</p>
              <h3 className="text-xl font-extrabold text-[#121b2d] mb-3">
                {top10[0].player.name.split(" ").slice(-1)[0]} leads the league.
              </h3>
              <div className="flex flex-col divide-y divide-gray-100">
                {top10.map((r, i) => (
                  <div key={r.player.playerId} className={`flex items-center gap-3 py-2.5 ${i === 0 ? "bg-blue-50 -mx-3 px-3 rounded-lg" : ""}`}>
                    <span className={`w-5 text-sm font-bold shrink-0 ${i === 0 ? "text-blue-700" : "text-gray-400"}`}>{i + 1}</span>
                    {r.player.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.player.logoUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-gray-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#121b2d] truncate">{r.player.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {r.player.team}
                        {r.player.positionBucket ? ` · ${r.player.positionBucket}` : ""}
                        {r.player.age !== null ? ` · ${r.player.age}y` : ""}
                        {i === 0 && top10.length > 1 ? ` · ${(r.value - top10[1].value).toFixed(category.decimals)} clear of ${top10[1].player.name}` : ""}
                      </p>
                    </div>
                    <span className="text-base font-bold text-[#121b2d] shrink-0">{fmt(r.value, category.decimals, category.suffix)}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-400">{ranked.length} players ranked.</p>
          </div>
        )}
      </div>
    </div>
  );
}
