// components/scouting/PlayerTable.tsx
"use client";
import { useMemo, useState } from "react";
import { NexusPlayerRow, PlayerProfileRow, overallQualityScore, positionBucketOf } from "@/lib/scouting/players";
import { stripDiacritics } from "@/lib/textUtils";
import { PlayerDetailModal } from "./PlayerDetailModal";

type Column = {
  key: string;
  label: string;
  decimals?: number;
  suffix?: string;
  getValue?: (p: NexusPlayerRow, leaguePool: PlayerProfileRow[]) => number | null;
};

const SCORE_COLUMN: Column = {
  key: "__score",
  label: "Score",
  decimals: 1,
  getValue: (p, leaguePool) => overallQualityScore(p, positionBucketOf(p.position_group), leaguePool),
};

const TABS: { key: string; label: string; columns: Column[] }[] = [
  {
    key: "overview",
    label: "Overview",
    columns: [
      SCORE_COLUMN,
      { key: "matches_played", label: "MP" },
      { key: "minutes_played", label: "Min" },
      { key: "goals", label: "Goals" },
      { key: "assists", label: "Assists" },
      { key: "xg", label: "xG", decimals: 2 },
      { key: "xa", label: "xA", decimals: 2 },
    ],
  },
  {
    key: "attacking",
    label: "Attacking",
    columns: [
      SCORE_COLUMN,
      { key: "goals_per90", label: "Goals/90", decimals: 2 },
      { key: "xg_per90", label: "xG/90", decimals: 2 },
      { key: "non_penalty_goals_per90", label: "NP Goals/90", decimals: 2 },
      { key: "shots_per90", label: "Shots/90", decimals: 2 },
      { key: "touches_in_box_per90", label: "Box Touch/90", decimals: 2 },
      { key: "shots_on_target_pct", label: "Shots on Tgt%", decimals: 0, suffix: "%" },
      { key: "goal_conversion_pct", label: "Goal Conv%", decimals: 0, suffix: "%" },
      { key: "finishing_efficiency", label: "Finishing", decimals: 1 },
    ],
  },
  {
    key: "creativity",
    label: "Creativity",
    columns: [
      SCORE_COLUMN,
      { key: "xa_per90", label: "xA/90", decimals: 2 },
      { key: "key_passes_per90", label: "Key Passes/90", decimals: 2 },
      { key: "shot_assists_per90", label: "Shot Assists/90", decimals: 2 },
      { key: "smart_passes_per90", label: "Smart Passes/90", decimals: 2 },
      { key: "accurate_smart_passes_pct", label: "Acc Smart Pass%", decimals: 0, suffix: "%" },
      { key: "through_passes_per90", label: "Through Passes/90", decimals: 2 },
      { key: "deep_completions_per90", label: "Deep Completions/90", decimals: 2 },
    ],
  },
  {
    key: "passing",
    label: "Passing",
    columns: [
      SCORE_COLUMN,
      { key: "passes_per90", label: "Passes/90", decimals: 2 },
      { key: "accurate_passes_pct", label: "Acc Passes%", decimals: 0, suffix: "%" },
      { key: "forward_passes_per90", label: "Fwd Passes/90", decimals: 2 },
      { key: "long_passes_per90", label: "Long Passes/90", decimals: 2 },
      { key: "accurate_long_passes_pct", label: "Acc Long Pass%", decimals: 0, suffix: "%" },
      { key: "progressive_passes_per90", label: "Prog Passes/90", decimals: 2 },
      { key: "accurate_progressive_passes_pct", label: "Acc Prog Pass%", decimals: 0, suffix: "%" },
      { key: "passes_to_final_third_per90", label: "Passes to Final 3rd/90", decimals: 2 },
    ],
  },
  {
    key: "defending",
    label: "Defending",
    columns: [
      SCORE_COLUMN,
      { key: "padj_interceptions", label: "PAdj Int", decimals: 2 },
      { key: "interceptions_per90", label: "Int/90", decimals: 2 },
      { key: "defensive_duels_per90", label: "Def Duels/90", decimals: 2 },
      { key: "defensive_duels_won_pct", label: "Def Duels Won%", decimals: 0, suffix: "%" },
      { key: "sliding_tackles_per90", label: "Sliding Tackles/90", decimals: 2 },
      { key: "shots_blocked_per90", label: "Blocks/90", decimals: 2 },
      { key: "fouls_per90", label: "Fouls/90", decimals: 2 },
    ],
  },
  {
    key: "dribbling",
    label: "Dribbling",
    columns: [
      SCORE_COLUMN,
      { key: "dribbles_per90", label: "Dribbles/90", decimals: 2 },
      { key: "successful_dribbles_pct", label: "Succ Dribbles%", decimals: 0, suffix: "%" },
      { key: "progressive_runs_per90", label: "Prog Runs/90", decimals: 2 },
      { key: "accelerations_per90", label: "Accelerations/90", decimals: 2 },
      { key: "offensive_duels_per90", label: "Off Duels/90", decimals: 2 },
      { key: "offensive_duels_won_pct", label: "Off Duels Won%", decimals: 0, suffix: "%" },
      { key: "fouls_suffered_per90", label: "Fouls Suffered/90", decimals: 2 },
    ],
  },
];

function columnValue(p: NexusPlayerRow, col: Column, leaguePool: PlayerProfileRow[]): number | null {
  if (col.getValue) return col.getValue(p, leaguePool);
  const v = p[col.key];
  return typeof v === "number" ? v : null;
}

export function PlayerTable({ players, leaguePool }: { players: NexusPlayerRow[]; leaguePool: PlayerProfileRow[] }) {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("__score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedPlayer, setSelectedPlayer] = useState<NexusPlayerRow | null>(null);

  const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  const filtered = useMemo(
    () => players.filter((p) => stripDiacritics(p.player_name.toLowerCase()).includes(stripDiacritics(query.toLowerCase()))),
    [players, query]
  );

  const sortColumn = tab.columns.find((c) => c.key === sortKey) ?? SCORE_COLUMN;

  const sorted = useMemo(() => {
    const rows = filtered.slice();
    rows.sort((a, b) => {
      const av = columnValue(a, sortColumn, leaguePool) ?? -Infinity;
      const bv = columnValue(b, sortColumn, leaguePool) ?? -Infinity;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return rows;
  }, [filtered, sortColumn, sortDir, leaguePool]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Player Table</h3>

      <div className="flex gap-2 flex-wrap mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              activeTab === t.key
                ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#14151a] border-blue-600 dark:border-[#ffcf4d]"
                : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#2a2b30] hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <span className="text-xs text-gray-500">
          Found <b className="text-gray-900 dark:text-white">{sorted.length}</b> players
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player name..."
          className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white w-64 outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
        />
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 240 + tab.columns.length * 100 }}>
          <div
            className="grid px-4 pb-2"
            style={{ gridTemplateColumns: `220px repeat(${tab.columns.length}, minmax(90px, 1fr))` }}
          >
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Player</span>
            {tab.columns.map((col) => (
              <button
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className="text-right text-xs text-gray-500 dark:text-gray-400 font-semibold cursor-pointer select-none hover:text-gray-900 dark:hover:text-white whitespace-nowrap"
              >
                {col.label}
                {sortKey === col.key && <span className="ml-1 text-blue-600 dark:text-[#ffcf4d]">{sortDir === "desc" ? "↓" : "↑"}</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {sorted.map((p) => (
              <div
                key={p.player_master_id}
                onClick={() => setSelectedPlayer(p)}
                className="grid items-center bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg px-4 py-3 hover:border-blue-600/40 dark:hover:border-[#ffcf4d]/40 cursor-pointer"
                style={{ gridTemplateColumns: `220px repeat(${tab.columns.length}, minmax(90px, 1fr))` }}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{p.player_name}</div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {p.position_group} · {p.age ?? "—"}y · {p.minutes_played}&apos;
                  </div>
                </div>
                {tab.columns.map((col) => {
                  const v = columnValue(p, col, leaguePool);
                  return (
                    <div key={col.key} className="text-right text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {v === null ? "—" : `${v.toFixed(col.decimals ?? 2)}${col.suffix ?? ""}`}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <PlayerDetailModal player={selectedPlayer} leaguePool={leaguePool} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}
