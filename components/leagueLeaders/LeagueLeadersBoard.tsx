// components/leagueLeaders/LeagueLeadersBoard.tsx
"use client";
import { useMemo, useState } from "react";
import { STAT_CATEGORIES, type LeagueLeaderRawRow, type StatGroup } from "@/lib/scouting/leagueLeadersCategories";

const GROUPS: StatGroup[] = ["Attacking", "Passing & Creativity", "Defending", "Dribbling & Duels", "Discipline"];

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
const numberClass = "w-16 bg-white border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700";

export function LeagueLeadersBoard({ players }: { players: LeagueLeaderRawRow[] }) {
  const [categoryKey, setCategoryKey] = useState(STAT_CATEGORIES[0].key);
  const [position, setPosition] = useState("all");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [minMinutes, setMinMinutes] = useState("50");
  const [maxMinutes, setMaxMinutes] = useState("");
  const category = STAT_CATEGORIES.find((c) => c.key === categoryKey)!;

  const positions = useMemo(() => {
    return [...new Set(players.map((p) => p.position).filter((p): p is string => !!p))].sort();
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const minA = minAge === "" ? null : Number(minAge);
    const maxA = maxAge === "" ? null : Number(maxAge);
    const minM = minMinutes === "" ? null : Number(minMinutes);
    const maxM = maxMinutes === "" ? null : Number(maxMinutes);
    return players.filter((p) => {
      if (position !== "all" && p.position !== position) return false;
      if (minA !== null && p.age !== null && p.age < minA) return false;
      if (maxA !== null && p.age !== null && p.age > maxA) return false;
      if (minM !== null && p.minutesPlayed < minM) return false;
      if (maxM !== null && p.minutesPlayed > maxM) return false;
      return true;
    });
  }, [players, position, minAge, maxAge, minMinutes, maxMinutes]);

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
      <div className="flex flex-wrap items-end gap-3">
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
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">Position</label>
          <select value={position} onChange={(e) => setPosition(e.target.value)} className={selectClass}>
            <option value="all">All positions</option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">Age</label>
          <div className="flex items-center gap-1.5">
            <input type="number" placeholder="Min" value={minAge} onChange={(e) => setMinAge(e.target.value)} className={numberClass} />
            <span className="text-gray-300">–</span>
            <input type="number" placeholder="Max" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className={numberClass} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">Minutes played</label>
          <div className="flex items-center gap-1.5">
            <input type="number" placeholder="Min" value={minMinutes} onChange={(e) => setMinMinutes(e.target.value)} className={numberClass} />
            <span className="text-gray-300">–</span>
            <input type="number" placeholder="Max" value={maxMinutes} onChange={(e) => setMaxMinutes(e.target.value)} className={numberClass} />
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-gray-500">No qualifying players for this filter.</p>
      ) : (
        <>
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
                      {r.player.position ? ` · ${r.player.position}` : ""}
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
        </>
      )}
    </div>
  );
}
