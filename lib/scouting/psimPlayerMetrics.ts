// lib/scouting/psimPlayerMetrics.ts
import { PsimPlayerRow, percentileRank, getMetricValue } from "./psimPlayerTypes";

// Position buckets + per-bucket "what to compare" for the PSIM player_season_stats
// table. Verified directly against the live schema: matches_played, minutes_played,
// goals, xg, assists, xa, age, position are top-level columns; everything else
// (per-90s, %s) lives in the `stats` JSONB column, keyed by slug(wyscout label) with
// an explicit "_pct" suffix on every percentage field (e.g. "Defensive duels won, %"
// -> stats.defensive_duels_won_pct). Keys below are hardcoded against a real sample
// row, not guessed.
export type PsimMetric = { key: string; label: string; decimals: number; suffix?: string; invert?: boolean };

// Wyscout's detailed position codes, grouped the same way lib/keyMetrics.ts groups
// the old project's data (RB+LB together, RW+LW together, everything else 1:1).
export const WYSCOUT_POSITION_BUCKETS: Record<string, string[]> = {
  GK: ["GK"],
  "RB/LB": ["RB", "RWB", "LB", "LWB"],
  CB: ["CB", "RCB", "LCB"],
  DM: ["DMF", "RDMF", "LDMF"],
  CM: ["CMF", "RCMF", "LCMF"],
  AM: ["AMF", "RAMF", "LAMF"],
  "RW/LW": ["RW", "LW"],
  CF: ["CF", "RCF", "LCF", "SS"],
};

/** A player's `position` field can list several codes ("LW, LAMF") — bucket by the first (primary) one. */
export function positionBucketOf(position: string | null | undefined): string | null {
  if (!position) return null;
  const primary = position.split(",")[0].trim().toUpperCase();
  for (const [bucket, codes] of Object.entries(WYSCOUT_POSITION_BUCKETS)) {
    if (codes.includes(primary)) return bucket;
  }
  return null;
}

function m(key: string, label: string, decimals: number, suffix?: string, invert?: boolean): PsimMetric {
  return { key, label, decimals, suffix, invert };
}

const COLOR = {
  blue: { light: "#2a78d6", dark: "#3987e5" },
  orange: { light: "#eb6834", dark: "#d95926" },
  green: { light: "#1baf7a", dark: "#199e70" },
  yellow: { light: "#eda100", dark: "#c98500" },
  pink: { light: "#e87ba4", dark: "#d55181" },
};

export type MetricGroup = { title: string; color: { light: string; dark: string }; metrics: PsimMetric[] };

// One entry per position bucket. Picked from the raw Wyscout per-90 / % stats that
// are actually meaningful for that bucket — no synthetic "quality" scores (the old
// project's mv_players_complete precomputes those; this table doesn't).
export const BUCKET_METRIC_GROUPS: Record<string, MetricGroup[]> = {
  GK: [
    {
      title: "Shot Stopping",
      color: COLOR.pink,
      metrics: [
        m("prevented_goals_per_90", "Prevented goals per 90", 2),
        m("save_rate_pct", "Save rate", 0, "%"),
        m("conceded_goals_per_90", "Conceded goals per 90", 2, undefined, true),
        m("xg_against_per_90", "xG against per 90", 2, undefined, true),
      ],
    },
    {
      title: "Distribution & Sweeping",
      color: COLOR.green,
      metrics: [
        m("accurate_passes_pct", "Accurate passes", 0, "%"),
        m("accurate_long_passes_pct", "Accurate long passes", 0, "%"),
        m("exits_per_90", "Exits per 90", 2),
        m("back_passes_received_as_gk_per_90", "Back passes received/90", 2),
      ],
    },
  ],
  CB: [
    {
      title: "Defending",
      color: COLOR.yellow,
      metrics: [
        m("defensive_duels_per_90", "Defensive duels per 90", 2),
        m("defensive_duels_won_pct", "Defensive duels won", 0, "%"),
        m("aerial_duels_per_90", "Aerial duels per 90", 2),
        m("aerial_duels_won_pct", "Aerial duels won", 0, "%"),
        m("padj_interceptions", "PAdj Interceptions", 2),
      ],
    },
    {
      title: "Passing",
      color: COLOR.green,
      metrics: [
        m("accurate_passes_pct", "Accurate passes", 0, "%"),
        m("accurate_long_passes_pct", "Accurate long passes", 0, "%"),
        m("progressive_passes_per_90", "Progressive passes per 90", 2),
      ],
    },
  ],
  "RB/LB": [
    {
      title: "Defending",
      color: COLOR.yellow,
      metrics: [m("defensive_duels_per_90", "Defensive duels per 90", 2), m("defensive_duels_won_pct", "Defensive duels won", 0, "%")],
    },
    {
      title: "Attacking & Crossing",
      color: COLOR.orange,
      metrics: [
        m("crosses_per_90", "Crosses per 90", 2),
        m("accurate_crosses_pct", "Accurate crosses", 0, "%"),
        m("xa_per_90", "xA per 90", 2),
        m("successful_dribbles_pct", "Successful dribbles", 0, "%"),
      ],
    },
    {
      title: "Progression",
      color: COLOR.green,
      metrics: [m("progressive_passes_per_90", "Progressive passes per 90", 2), m("accurate_progressive_passes_pct", "Accurate progressive passes", 0, "%")],
    },
  ],
  DM: [
    {
      title: "Defending",
      color: COLOR.yellow,
      metrics: [
        m("padj_interceptions", "PAdj Interceptions", 2),
        m("defensive_duels_per_90", "Defensive duels per 90", 2),
        m("defensive_duels_won_pct", "Defensive duels won", 0, "%"),
      ],
    },
    {
      title: "Passing & Retention",
      color: COLOR.green,
      metrics: [
        m("accurate_passes_pct", "Accurate passes", 0, "%"),
        m("progressive_passes_per_90", "Progressive passes per 90", 2),
        m("received_passes_per_90", "Received passes per 90", 2),
      ],
    },
    {
      title: "Duels",
      color: COLOR.blue,
      metrics: [m("duels_per_90", "Duels per 90", 2), m("duels_won_pct", "Duels won", 0, "%")],
    },
  ],
  CM: [
    {
      title: "Passing & Progression",
      color: COLOR.green,
      metrics: [
        m("accurate_passes_pct", "Accurate passes", 0, "%"),
        m("progressive_passes_per_90", "Progressive passes per 90", 2),
        m("received_passes_per_90", "Received passes per 90", 2),
      ],
    },
    {
      title: "Creativity",
      color: COLOR.orange,
      metrics: [
        m("xa_per_90", "xA per 90", 2),
        m("key_passes_per_90", "Key passes per 90", 2),
        m("through_passes_per_90", "Through passes per 90", 2),
        m("smart_passes_per_90", "Smart passes per 90", 2),
      ],
    },
  ],
  AM: [
    {
      title: "Creativity",
      color: COLOR.orange,
      metrics: [
        m("xa_per_90", "xA per 90", 2),
        m("key_passes_per_90", "Key passes per 90", 2),
        m("shot_assists_per_90", "Shot assists per 90", 2),
        m("accurate_smart_passes_pct", "Accurate smart passes", 0, "%"),
      ],
    },
    {
      title: "Attacking",
      color: COLOR.blue,
      metrics: [
        m("xg_per_90", "xG per 90", 2),
        m("successful_dribbles_pct", "Successful dribbles", 0, "%"),
        m("progressive_passes_per_90", "Progressive passes per 90", 2),
      ],
    },
  ],
  "RW/LW": [
    {
      title: "Finishing",
      color: COLOR.blue,
      metrics: [m("xg_per_90", "xG per 90", 2), m("touches_in_box_per_90", "Touches in box per 90", 2)],
    },
    {
      title: "Creativity & Dribbling",
      color: COLOR.orange,
      metrics: [
        m("xa_per_90", "xA per 90", 2),
        m("successful_dribbles_pct", "Successful dribbles", 0, "%"),
        m("progressive_runs_per_90", "Progressive runs per 90", 2),
        m("accurate_crosses_pct", "Accurate crosses", 0, "%"),
      ],
    },
    {
      title: "Duels",
      color: COLOR.green,
      metrics: [m("offensive_duels_won_pct", "Offensive duels won", 0, "%")],
    },
  ],
  CF: [
    {
      title: "Finishing",
      color: COLOR.blue,
      metrics: [
        m("goals_per_90", "Goals per 90", 2),
        m("xg_per_90", "xG per 90", 2),
        m("shots_on_target_pct", "Shots on target", 0, "%"),
        m("goal_conversion_pct", "Goal conversion", 0, "%"),
      ],
    },
    {
      title: "Physical & Duels",
      color: COLOR.green,
      metrics: [
        m("touches_in_box_per_90", "Touches in box per 90", 2),
        m("aerial_duels_won_pct", "Aerial duels won", 0, "%"),
        m("offensive_duels_won_pct", "Offensive duels won", 0, "%"),
      ],
    },
  ],
};

export interface ComputedMetric {
  key: string;
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
  percentile: number;
}

export interface ComputedGroup {
  title: string;
  color: { light: string; dark: string };
  items: ComputedMetric[];
}

/** Buckets `player` by position, filters `leaguePool` down to the same bucket, and
 * computes per-metric percentiles against that pool — the shared logic behind
 * both the stat-row breakdown and the radar chart on a player's profile page. */
export function computePlayerComparison(player: PsimPlayerRow, leaguePool: PsimPlayerRow[]) {
  const bucket = positionBucketOf(player.position);
  const positions = bucket ? WYSCOUT_POSITION_BUCKETS[bucket] ?? [] : [];
  const pool = leaguePool.filter((r) => positions.includes((r.position ?? "").split(",")[0].trim().toUpperCase()));
  const groups = bucket ? BUCKET_METRIC_GROUPS[bucket] ?? [] : [];

  const computedGroups: ComputedGroup[] = groups.map((group) => ({
    title: group.title,
    color: group.color,
    items: group.metrics.map((metric) => {
      const value = getMetricValue(player, metric.key) ?? 0;
      const poolValues = pool.map((r) => getMetricValue(r, metric.key)).filter((v): v is number => v !== null);
      const rawPercentile = percentileRank(poolValues, value);
      return {
        key: metric.key,
        label: metric.label,
        value,
        decimals: metric.decimals,
        suffix: metric.suffix,
        percentile: metric.invert ? 100 - rawPercentile : rawPercentile,
      };
    }),
  }));

  return { bucket, pool, groups, computedGroups };
}
