// components/scouting/PlayerDetailModal.tsx
"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { NexusPlayerRow, PlayerProfileRow, percentileRank, positionBucketOf } from "@/lib/scouting/players";
import { POSITION_DB_VALUES } from "@/lib/keyMetrics";
import { PlayerPizzaChart } from "./PlayerPizzaChart";

type ProfileKey = keyof Omit<PlayerProfileRow, "position_group">;

const FIELD_META: Record<ProfileKey, { label: string; decimals: number; suffix?: string }> = {
  goals_per90: { label: "Goals/90", decimals: 2 },
  xg_per90: { label: "xG/90", decimals: 2 },
  finishing_efficiency: { label: "Finishing Efficiency", decimals: 1 },
  shots_quality: { label: "Shots Quality", decimals: 1 },
  touches_in_box_per90: { label: "Touches in Box/90", decimals: 2 },
  offensive_duels_quality: { label: "Off Duels Quality", decimals: 1 },

  xa_per90: { label: "xA/90", decimals: 2 },
  creativity_quality: { label: "Creativity Quality", decimals: 1 },
  shot_assists_per90: { label: "Shot Assists/90", decimals: 2 },
  smart_passes_quality: { label: "Smart Passes Quality", decimals: 1 },
  passes_to_final_third_quality: { label: "Passes to Final 3rd Quality", decimals: 1 },
  crosses_quality: { label: "Crosses Quality", decimals: 1 },

  passes_quality: { label: "Passes Quality", decimals: 1 },
  accurate_passes_pct: { label: "Accurate Passes %", decimals: 0, suffix: "%" },
  progressive_passes_quality: { label: "Progressive Passes Quality", decimals: 1 },
  progressive_passes_per90: { label: "Progressive Passes/90", decimals: 2 },
  forward_passes_quality: { label: "Forward Passes Quality", decimals: 1 },
  long_passes_quality: { label: "Long Passes Quality", decimals: 1 },
  long_passes_per90: { label: "Long Passes/90", decimals: 2 },
  accurate_long_passes_pct: { label: "Accurate Long Passes %", decimals: 0, suffix: "%" },
  received_passes_per90: { label: "Received Passes/90", decimals: 2 },
  carrying_quality: { label: "Carrying Quality", decimals: 1 },
  dribbles_quality: { label: "Dribbles Quality", decimals: 1 },

  padj_interceptions: { label: "PAdj Interceptions", decimals: 2 },
  defensive_duels_quality: { label: "Defensive Duels Quality", decimals: 1 },
  defensive_activity: { label: "Defensive Activity", decimals: 1 },
  aerial_quality: { label: "Aerial Quality", decimals: 1 },
  fouls_per90: { label: "Fouls/90", decimals: 2 },

  prevented_goals_per90: { label: "Prevented Goals/90", decimals: 2 },
  shot_stopping_quality: { label: "Shot Stopping Quality", decimals: 1 },
  aerial_ability_gk: { label: "Aerial Ability (GK)", decimals: 1 },
  exits_per90: { label: "Exits/90", decimals: 2 },
  back_passes_received_as_gk_per90: { label: "Back Passes Received/90", decimals: 2 },
};

// Categorical colors (CVD-validated in the specific trios each role actually
// renders together — see dataviz skill's palette validator. Orange+yellow
// never appear in the same role: that pair fails the normal-vision floor.)
const COLOR = {
  blue: { light: "#2a78d6", dark: "#3987e5" },
  orange: { light: "#eb6834", dark: "#d95926" },
  green: { light: "#1baf7a", dark: "#199e70" },
  yellow: { light: "#eda100", dark: "#c98500" },
  pink: { light: "#e87ba4", dark: "#d55181" },
};

type Role = "FWD" | "MID" | "DEF" | "GK";

function roleOf(bucket: string | null): Role {
  if (bucket === "GK") return "GK";
  if (bucket === "CF" || bucket === "RW/LW") return "FWD";
  if (bucket === "DM" || bucket === "CM" || bucket === "AM") return "MID";
  return "DEF"; // CB, RB/LB, and anything unmapped
}

// Twelve stats per role on the pizza chart, picked for relevance to that
// role rather than one universal list — a forward and a center-back have
// almost nothing in common worth comparing. Grouped into 3 color-coded
// sub-themes each. The detail list alongside it goes further: every chart
// key plus a few extra related ones, still scoped to the same role.
const ROLE_TEMPLATES: Record<
  Role,
  { title: string; color: { light: string; dark: string }; chartKeys: ProfileKey[]; extraKeys: ProfileKey[] }[]
> = {
  FWD: [
    { title: "Finishing", color: COLOR.blue, chartKeys: ["goals_per90", "xg_per90", "finishing_efficiency", "shots_quality"], extraKeys: [] },
    { title: "Creativity", color: COLOR.orange, chartKeys: ["xa_per90", "dribbles_quality", "shot_assists_per90", "crosses_quality"], extraKeys: ["smart_passes_quality"] },
    { title: "Physical & Duels", color: COLOR.green, chartKeys: ["touches_in_box_per90", "offensive_duels_quality", "aerial_quality", "carrying_quality"], extraKeys: ["passes_to_final_third_quality"] },
  ],
  MID: [
    { title: "Passing & Progression", color: COLOR.green, chartKeys: ["passes_quality", "progressive_passes_quality", "carrying_quality", "forward_passes_quality"], extraKeys: ["progressive_passes_per90", "received_passes_per90"] },
    { title: "Creativity", color: COLOR.orange, chartKeys: ["creativity_quality", "xa_per90", "smart_passes_quality", "shot_assists_per90"], extraKeys: ["passes_to_final_third_quality"] },
    { title: "Defensive Work", color: COLOR.blue, chartKeys: ["padj_interceptions", "defensive_duels_quality", "defensive_activity", "aerial_quality"], extraKeys: ["fouls_per90"] },
  ],
  DEF: [
    { title: "Defending", color: COLOR.yellow, chartKeys: ["defensive_duels_quality", "padj_interceptions", "aerial_quality", "defensive_activity"], extraKeys: ["fouls_per90"] },
    { title: "Passing", color: COLOR.green, chartKeys: ["progressive_passes_quality", "passes_quality", "long_passes_quality", "accurate_passes_pct"], extraKeys: ["accurate_long_passes_pct"] },
    { title: "Creating", color: COLOR.blue, chartKeys: ["crosses_quality", "carrying_quality", "dribbles_quality", "xa_per90"], extraKeys: ["passes_to_final_third_quality"] },
  ],
  GK: [
    { title: "Shot Stopping", color: COLOR.pink, chartKeys: ["prevented_goals_per90", "shot_stopping_quality", "aerial_ability_gk"], extraKeys: [] },
    { title: "Sweeping", color: COLOR.blue, chartKeys: ["exits_per90", "back_passes_received_as_gk_per90"], extraKeys: [] },
    { title: "Distribution", color: COLOR.green, chartKeys: ["passes_quality", "long_passes_quality", "accurate_long_passes_pct", "accurate_passes_pct", "progressive_passes_per90", "forward_passes_quality", "received_passes_per90"], extraKeys: [] },
  ],
};

function barColor(pct: number) {
  if (pct >= 70) return "#34d399"; // emerald
  if (pct >= 40) return "#fbbf24"; // amber
  return "#f87171"; // red
}

function StatRow({
  label,
  value,
  decimals,
  suffix,
  percentile,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
  percentile: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-44 shrink-0 text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="w-16 shrink-0 text-sm font-mono font-bold text-gray-900 dark:text-white">
        {value.toFixed(decimals)}
        {suffix ?? ""}
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] overflow-hidden relative">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, percentile)}%`, backgroundColor: barColor(percentile) }}
        />
      </div>
      <div className="w-8 shrink-0 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">{Math.round(percentile)}</div>
    </div>
  );
}

export function PlayerDetailModal({
  player,
  leaguePool,
  onClose,
}: {
  player: NexusPlayerRow | null;
  leaguePool: PlayerProfileRow[];
  onClose: () => void;
}) {
  // Hooks run unconditionally before the early return below.
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Lock the page behind the modal so only the modal's own content scrolls.
  // Both <html> and <body> can end up as the document's root scroller
  // depending on layout, so both need locking — body alone leaves the page
  // still scrollable via <html>.
  useEffect(() => {
    if (!player) return;
    const html = document.documentElement;
    const originalHtml = html.style.overflow;
    const originalBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = originalHtml;
      document.body.style.overflow = originalBody;
    };
  }, [player]);

  if (!player) return null;

  const bucket = positionBucketOf(player.position_group);
  const positions = bucket ? POSITION_DB_VALUES[bucket] ?? [] : [];
  const pool = leaguePool.filter((r) => positions.includes(r.position_group));
  const role = roleOf(bucket);

  // Computed once and reused by both views: the pizza chart takes just the
  // 12 chartKeys per role, the detail list alongside it adds extraKeys on
  // top for a fuller (but still position-scoped) breakdown. Same underlying
  // numbers either way, so the two views can never drift out of sync.
  const computeItems = (keys: ProfileKey[]) =>
    keys.map((key) => {
      const meta = FIELD_META[key];
      const raw = player[key];
      const value = typeof raw === "number" ? raw : 0;
      const poolValues = pool.map((r) => r[key]).filter((v): v is number => typeof v === "number");
      return {
        key,
        label: meta.label,
        value,
        decimals: meta.decimals,
        suffix: meta.suffix,
        percentile: percentileRank(poolValues, value),
      };
    });

  const pizzaGroups = ROLE_TEMPLATES[role].map((group) => ({
    title: group.title,
    color: group.color,
    items: computeItems(group.chartKeys),
  }));

  const listGroups = ROLE_TEMPLATES[role].map((group) => ({
    title: group.title,
    color: group.color,
    items: computeItems([...group.chartKeys, ...group.extraKeys]),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-[#2a2b30]">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{player.player_name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {player.team} · {player.role_label ?? player.position_group}
              {player.age !== null ? ` · ${player.age}y` : ""}
              {player.foot ? ` · ${player.foot} foot` : ""}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {player.matches_played} apps · {player.minutes_played}&apos; · {player.goals} goals · {player.assists} assists
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl leading-none px-2" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col md:flex-row gap-6 md:max-h-[70vh]">
          {pool.length === 0 && (
            <p className="text-xs text-gray-500 md:hidden">
              No league pool available for this position yet — percentiles below default to 50.
            </p>
          )}

          <div className="md:sticky md:top-0">
            <PlayerPizzaChart groups={pizzaGroups} />
          </div>

          <div className="flex flex-col gap-6 md:flex-1 md:overflow-y-auto md:pr-1">
            {pool.length === 0 && (
              <p className="text-xs text-gray-500 hidden md:block">
                No league pool available for this position yet — percentiles below default to 50.
              </p>
            )}
            {listGroups.map((group) => (
              <div key={group.title}>
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-1"
                  style={{ color: isDark ? group.color.dark : group.color.light }}
                >
                  {group.title}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-[#2a2b30]">
                  {group.items.map((item) => (
                    <StatRow
                      key={item.key}
                      label={item.label}
                      value={item.value}
                      decimals={item.decimals}
                      suffix={item.suffix}
                      percentile={item.percentile}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
