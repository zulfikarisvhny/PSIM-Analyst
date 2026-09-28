// components/scouting/QuickStats.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { LeagueTeamRow } from "@/lib/scouting/types";
import type { LastSeasonOverview } from "@/lib/scouting/lastSeasonOverview";
import type { SeasonStatComparisonRow } from "@/lib/scouting/seasonStatComparison";

interface StatDef {
  key: string;
  label: string;
  get: (r: LeagueTeamRow) => number;
  getLastSeason?: (s: LastSeasonOverview) => number | null;
  // When set, looks up lastSeasonAvg from the richer 28-metric season
  // comparison (real match-derived averages, both seasons) instead of
  // getLastSeason above — preferred whenever a matching metric exists there.
  comparisonLabel?: string;
  higherIsBetter: boolean;
  unit: string;
  decimals: number;
}

// The full pool a card's dropdown can switch to — not just the 4 shown by default.
const STAT_POOL: StatDef[] = [
  {
    key: "goals",
    label: "Goals",
    get: (r) => r.goals / r.MP,
    getLastSeason: (s) => (s.matchesPlayed ? s.goalsFor / s.matchesPlayed : null),
    higherIsBetter: true,
    unit: "",
    decimals: 2,
  },
  {
    key: "goalsConceded",
    label: "Goals Conceded",
    get: (r) => r.opp_goals / r.MP,
    getLastSeason: (s) => (s.matchesPlayed ? s.goalsAgainst / s.matchesPlayed : null),
    higherIsBetter: false,
    unit: "",
    decimals: 2,
  },
  {
    key: "possession",
    label: "Possession",
    get: (r) => r["Poss %"],
    getLastSeason: (s) => s.possessionPct,
    higherIsBetter: true,
    unit: "%",
    decimals: 1,
  },
  {
    key: "passAccuracy",
    label: "Pass Accuracy",
    get: (r) => r["Pass Acc %"],
    getLastSeason: (s) => s.passAccuracyPct,
    comparisonLabel: "Pass Accuracy",
    higherIsBetter: true,
    unit: "%",
    decimals: 1,
  },
  {
    key: "xg",
    label: "xG",
    get: (r) => r.xg / r.MP,
    getLastSeason: (s) => s.avgXg,
    higherIsBetter: true,
    unit: "",
    decimals: 2,
  },
  { key: "shots", label: "Shots", get: (r) => r.shots / r.MP, higherIsBetter: true, unit: "", decimals: 1 },
  { key: "shotsOnTarget", label: "Shots on Target", get: (r) => r.shots_on_target / r.MP, comparisonLabel: "Shots on Target", higherIsBetter: true, unit: "", decimals: 1 },
  { key: "shotsConceded", label: "Shots Conceded", get: (r) => r.opp_shots / r.MP, higherIsBetter: false, unit: "", decimals: 1 },
  { key: "direct", label: "Direct Play", get: (r) => r["Direct %"], higherIsBetter: true, unit: "%", decimals: 1 },
  { key: "territory", label: "Territory", get: (r) => r["Territory %"], higherIsBetter: true, unit: "%", decimals: 1 },
  { key: "keyPasses", label: "Key Passes", get: (r) => r.key_passes / r.MP, higherIsBetter: true, unit: "", decimals: 1 },
  { key: "tackles", label: "Tackles", get: (r) => r.tackles / r.MP, higherIsBetter: true, unit: "", decimals: 1 },
  { key: "interceptions", label: "Interceptions", get: (r) => r.interceptions / r.MP, comparisonLabel: "Interceptions", higherIsBetter: true, unit: "", decimals: 1 },
  { key: "clearances", label: "Clearances", get: (r) => r.clearances / r.MP, comparisonLabel: "Clearances", higherIsBetter: true, unit: "", decimals: 1 },
  {
    key: "duelsWinPct",
    label: "Duels Win %",
    get: (r) => (r.duels_won / (r.duels_won + r.duels_lost)) * 100,
    comparisonLabel: "Duels Won",
    higherIsBetter: true,
    unit: "%",
    decimals: 1,
  },
  {
    key: "aerialWinPct",
    label: "Aerial Duels Win %",
    get: (r) => (r.aerial_duels_won / (r.aerial_duels_won + r.aerial_duels_lost)) * 100,
    comparisonLabel: "Aerial Duels Won",
    higherIsBetter: true,
    unit: "%",
    decimals: 1,
  },
  { key: "fouls", label: "Fouls Committed", get: (r) => r.fouls_committed / r.MP, higherIsBetter: false, unit: "", decimals: 1 },
];

const DEFAULT_SLOT_KEYS = ["goals", "goalsConceded", "possession", "passAccuracy"];
// Fixed per card position — the icon represents the slot, not whatever metric
// is currently plugged into it, so it stays put when you switch metrics.
const SLOT_ICONS = ["/icons/goals.png", "/icons/goals-conceded.png", "/icons/possession.png", "/icons/pass-accuracy.png"];

export function QuickStats({
  rows,
  focusTeam,
  lastSeason,
  seasonStatComparison,
}: {
  rows: LeagueTeamRow[];
  focusTeam: string;
  lastSeason?: LastSeasonOverview | null;
  seasonStatComparison?: SeasonStatComparisonRow[];
}) {
  const [slotKeys, setSlotKeys] = useState<string[]>(DEFAULT_SLOT_KEYS);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (openSlot === null) return;
      const el = cardRefs.current[openSlot];
      if (el && !el.contains(e.target as Node)) setOpenSlot(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openSlot]);

  const focusRow = rows.find((r) => r.Team === focusTeam);

  function compare(stat: StatDef) {
    if (!focusRow) return { value: 0, lastSeasonValue: null as number | null, diff: null as number | null, isBetter: null as boolean | null };
    const value = stat.get(focusRow);
    const comparisonRow = stat.comparisonLabel ? seasonStatComparison?.find((r) => r.label === stat.comparisonLabel) : undefined;
    const lastSeasonValue = comparisonRow
      ? comparisonRow.lastSeasonAvg
      : lastSeason && stat.getLastSeason
        ? stat.getLastSeason(lastSeason)
        : null;
    const diff = lastSeasonValue !== null ? value - lastSeasonValue : null;
    const isBetter = diff !== null ? (stat.higherIsBetter ? diff >= 0 : diff <= 0) : null;
    return { value, lastSeasonValue, diff, isBetter };
  }

  if (!focusRow) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {slotKeys.map((key, slotIdx) => {
        const stat = STAT_POOL.find((s) => s.key === key)!;
        const { value, diff: lastSeasonDiff, isBetter: isBetterThanLastSeason } = compare(stat);

        return (
          <div
            key={slotIdx}
            ref={(el) => {
              cardRefs.current[slotIdx] = el;
            }}
            className="relative bg-white border border-gray-200 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SLOT_ICONS[slotIdx]} alt="" className="w-8 h-8 rounded-full shrink-0" />
                <span className="text-[11px] text-gray-800">{stat.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenSlot((prev) => (prev === slotIdx ? null : slotIdx))}
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/arrow-button.png" alt="Change metric" className="w-6 h-6" />
              </button>
            </div>
            <div className="text-3xl font-semibold text-gray-900">
              {value.toFixed(stat.decimals)}
              {stat.unit}
            </div>
            {lastSeasonDiff !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isBetterThanLastSeason ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                  }`}
                >
                  {lastSeasonDiff >= 0 ? "▲" : "▼"} {Math.abs(lastSeasonDiff).toFixed(stat.decimals)}
                  {stat.unit}
                </span>
                <span className="text-[10px] text-gray-400">From PSIM last season</span>
              </div>
            )}

            {openSlot === slotIdx && (
              <div className="absolute right-4 top-14 z-20 w-48 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1.5">
                {STAT_POOL.map((option) => {
                  const optCompare = compare(option);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setSlotKeys((prev) => prev.map((k, i) => (i === slotIdx ? option.key : k)));
                        setOpenSlot(null);
                      }}
                      className={`w-full flex items-center justify-between gap-2 text-left px-3.5 py-2 text-xs hover:bg-gray-50 ${
                        option.key === key ? "text-blue-600 font-semibold" : "text-gray-700"
                      }`}
                    >
                      <span>{option.label}</span>
                      {optCompare.isBetter !== null && (
                        <span className={`text-[10px] font-bold shrink-0 ${optCompare.isBetter ? "text-emerald-600" : "text-red-500"}`}>
                          {optCompare.isBetter ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
