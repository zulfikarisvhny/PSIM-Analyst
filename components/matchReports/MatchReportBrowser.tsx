// components/matchReports/MatchReportBrowser.tsx
"use client";
import { useMemo, useState } from "react";
import { TimeSegmentChart } from "./TimeSegmentChart";
import { PassCombinationMatrix } from "./PassCombinationMatrix";
import { PhysicalStatsTable } from "./PhysicalStatsTable";
import { PitchLineup } from "./PitchLineup";
import { AccuracyDonuts } from "./AccuracyDonuts";

const PSIM = "PSIM Yogyakarta";

interface TeamMatchStatsSide {
  duration: number | null;
  scheme: string | null;
  goals: number | null;
  xg: number | null;
  possessionPct: number | null;
  stats: Record<string, string>;
}

interface TimeSegmentRow {
  segment: string;
  possessionPct: number | null;
  passAccuracyPct: number | null;
  longPassSharePct: number | null;
  duelsWinPct: number | null;
  attacksPerMin: number | null;
  recoveriesPerMin: number | null;
  avgFormationLineM: number | null;
  ppda: number | null;
}

interface PassNetworkPlayer {
  playerId: number;
  name: string;
  totalPasses: number;
}
interface PassNetworkEdge {
  fromPlayerId: number;
  toPlayerId: number;
  fromName: string;
  toName: string;
  passCount: number;
}
interface TeamPassNetwork {
  players: PassNetworkPlayer[];
  edges: PassNetworkEdge[];
}

interface PlayerPhysicalStat {
  playerId: number;
  name: string;
  totalDistanceM: number | null;
  highSpeedRunningM: number | null;
  sprintDistanceM: number | null;
  sprintCount: number | null;
  topSpeedKmh: number | null;
  accelerations: number | null;
  decelerations: number | null;
  minutesPlayed: number | null;
}

interface GoalEntry {
  minute: string;
  player: string;
}

interface MatchEventEntry {
  type: "goal" | "yellow_card" | "red_card" | "substitution";
  minute: string;
  player: string;
  subInPlayer: string | null;
}

interface LineupPlayerEntry {
  playerId: number | null;
  name: string;
  jersey: number | null;
  position: string;
  photoUrl: string | null;
}

interface MatchReportDetail {
  matchId: number;
  matchDate: string;
  competition: string | null;
  round: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  home: TeamMatchStatsSide | null;
  away: TeamMatchStatsSide | null;
  timeSegments: { home: TimeSegmentRow[]; away: TimeSegmentRow[] } | null;
  passNetwork: { home: TeamPassNetwork; away: TeamPassNetwork } | null;
  psimPhysicalStats: PlayerPhysicalStat[] | null;
  goals: { home: GoalEntry[]; away: GoalEntry[] } | null;
  events: { home: MatchEventEntry[]; away: MatchEventEntry[] } | null;
  lineups: { home: LineupPlayerEntry[]; away: LineupPlayerEntry[] } | null;
}

const SEGMENT_ORDER = ["0-15", "16-30", "31-45+", "46-60", "61-75", "76-90+"];
const TIME_SEGMENT_METRIC_KEYS: (keyof TimeSegmentRow)[] = [
  "possessionPct",
  "passAccuracyPct",
  "longPassSharePct",
  "duelsWinPct",
  "attacksPerMin",
  "recoveriesPerMin",
  "avgFormationLineM",
  "ppda",
];

/** PSIM's average vs the average of all opponents faced, across every match with imported data — the "Overall" view's headline numbers and Match Dynamics trend. */
function buildSeasonAggregate(reports: MatchReportDetail[]) {
  let psimGoals = 0,
    oppGoals = 0,
    psimXg = 0,
    oppXg = 0,
    psimPoss = 0,
    oppPoss = 0,
    n = 0;

  const segSums: { psim: number[]; opp: number[]; count: number[] }[] = SEGMENT_ORDER.map(() => ({
    psim: TIME_SEGMENT_METRIC_KEYS.map(() => 0),
    opp: TIME_SEGMENT_METRIC_KEYS.map(() => 0),
    count: TIME_SEGMENT_METRIC_KEYS.map(() => 0),
  }));

  for (const r of reports) {
    const isPsimHome = r.homeTeam === PSIM;
    const isPsimAway = r.awayTeam === PSIM;
    if (!isPsimHome && !isPsimAway) continue;
    const psimSide = isPsimHome ? r.home : r.away;
    const oppSide = isPsimHome ? r.away : r.home;
    if (psimSide && oppSide) {
      if (psimSide.goals !== null && oppSide.goals !== null) {
        psimGoals += psimSide.goals;
        oppGoals += oppSide.goals;
      }
      if (psimSide.xg !== null && oppSide.xg !== null) {
        psimXg += psimSide.xg;
        oppXg += oppSide.xg;
      }
      if (psimSide.possessionPct !== null && oppSide.possessionPct !== null) {
        psimPoss += psimSide.possessionPct;
        oppPoss += oppSide.possessionPct;
      }
      n++;
    }

    if (r.timeSegments) {
      const psimSegs = isPsimHome ? r.timeSegments.home : r.timeSegments.away;
      const oppSegs = isPsimHome ? r.timeSegments.away : r.timeSegments.home;
      SEGMENT_ORDER.forEach((seg, segIdx) => {
        const psimRow = psimSegs.find((s) => s.segment === seg);
        const oppRow = oppSegs.find((s) => s.segment === seg);
        TIME_SEGMENT_METRIC_KEYS.forEach((key, metricIdx) => {
          const pv = psimRow?.[key];
          const ov = oppRow?.[key];
          if (typeof pv === "number" && typeof ov === "number") {
            segSums[segIdx].psim[metricIdx] += pv;
            segSums[segIdx].opp[metricIdx] += ov;
            segSums[segIdx].count[metricIdx] += 1;
          }
        });
      });
    }
  }

  const avg = (sum: number, count: number) => (count > 0 ? sum / count : null);
  const psimSegments: TimeSegmentRow[] = SEGMENT_ORDER.map((seg, segIdx) => {
    const row: any = { segment: seg };
    TIME_SEGMENT_METRIC_KEYS.forEach((key, metricIdx) => {
      row[key] = avg(segSums[segIdx].psim[metricIdx], segSums[segIdx].count[metricIdx]);
    });
    return row;
  });
  const oppSegments: TimeSegmentRow[] = SEGMENT_ORDER.map((seg, segIdx) => {
    const row: any = { segment: seg };
    TIME_SEGMENT_METRIC_KEYS.forEach((key, metricIdx) => {
      row[key] = avg(segSums[segIdx].opp[metricIdx], segSums[segIdx].count[metricIdx]);
    });
    return row;
  });

  return {
    matchesUsed: n,
    goals: n > 0 ? { psim: psimGoals / n, opp: oppGoals / n } : null,
    xg: n > 0 ? { psim: psimXg / n, opp: oppXg / n } : null,
    possession: n > 0 ? { psim: psimPoss / n, opp: oppPoss / n } : null,
    timeSegments: { home: psimSegments, away: oppSegments },
  };
}

const SUMMARY_KEYS = ["shots_on_target", "corners", "yellow_red_cards", "fouls_suffered"];

// Same 55 keys as lib/matchReport/labels.ts's TEAM_STATS_LABELS (slugged),
// grouped by topic so "show more" opens one manageable section at a time
// instead of a 55-row wall.
const ATTACK_TYPES_KEYS = ["total_with_shots", "positional_attacks_with_shots", "counterattacks", "corners", "free_kicks", "corners_with_shots", "free_kicks_with_shots"];

const CATEGORIES: { title: string; keys: string[] }[] = [
  { title: "Shooting", keys: ["shots_on_target", "shots_on_post_blocked_wide", "from_penalty_area_on_target", "outside_penalty_area_on_target", "average_shot_distance_m"] },
  { title: "Possession", keys: ["pure_possession_time", "number_of_possessions", "possessions_reaching_opponent_half", "possessions_reaching_opponent_penalty_area", "average_possession_duration", "dead_time"] },
  {
    title: "Passing",
    keys: [
      "total_passes_accurate",
      "forward_passes_accurate",
      "back_passes_accurate",
      "lateral_passes_accurate",
      "progressive_passes_accurate",
      "long_passes_accurate",
      "passes_to_final_third_accurate",
      "average_pass_to_final_third_length_m",
      "passes_to_penalty_area_accurate",
      "smart_passes_accurate",
      "shot_assists",
      "through_passes_accurate",
      "crosses_accurate",
      "crosses_low_high_blocked",
      "deep_completions",
      "match_tempo",
      "average_pass_length_m",
    ],
  },
  {
    title: "Defending & Duels",
    keys: [
      "sliding_tackles",
      "interceptions",
      "clearances",
      "passes_allowed_per_def_action_ppda",
      "recoveries_low_medium_high",
      "opponent_half_recoveries",
      "losses_low_medium_high",
      "total_duels_won",
      "offensive_duels_won",
      "defensive_duels_won",
      "loose_ball_duels_won",
      "aerial_duels_won",
      "challenge_intensity",
      "dribbles_successful",
    ],
  },
  { title: "Discipline", keys: ["offsides", "fouls_suffered", "yellow_red_cards"] },
];

function parseLeadingNumber(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.match(/^-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function ComparisonRow({ label, homeRaw, awayRaw }: { label: string; homeRaw?: string; awayRaw?: string }) {
  const homeNum = parseLeadingNumber(homeRaw);
  const awayNum = parseLeadingNumber(awayRaw);
  let homePct = 50;
  let awayPct = 50;
  if (homeNum !== null && awayNum !== null && homeNum + awayNum > 0) {
    homePct = (homeNum / (homeNum + awayNum)) * 100;
    awayPct = 100 - homePct;
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{homeRaw ?? "—"}</span>
        <span className="text-gray-400 dark:text-gray-500 text-center flex-1 truncate text-xs font-medium">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0 text-right">{awayRaw ?? "—"}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-2 rounded-full bg-blue-600 dark:bg-[#3987e5]" style={{ width: `calc(${homePct}% - 2px)` }} />
        <div className="h-2 rounded-full bg-orange-500" style={{ width: `calc(${awayPct}% - 2px)` }} />
      </div>
    </div>
  );
}

function formatMatchDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function gameWeekLabel(round: string | null): string | null {
  if (!round) return null;
  const n = round.match(/\d+/)?.[0];
  return n ? `Game Week ${n}` : round;
}

/** PSIM's own result for this match — win/draw/loss, not just the home side's. */
function psimResultColor(report: MatchReportDetail): string {
  if (report.homeScore === null || report.awayScore === null) return "bg-gray-200 dark:bg-[#2a2b30]";
  const isPsimHome = report.homeTeam === PSIM;
  const isPsimAway = report.awayTeam === PSIM;
  if (!isPsimHome && !isPsimAway) return "bg-gray-200 dark:bg-[#2a2b30]";
  const psimGoals = isPsimHome ? report.homeScore : report.awayScore;
  const oppGoals = isPsimHome ? report.awayScore : report.homeScore;
  if (psimGoals > oppGoals) return "bg-emerald-500";
  if (psimGoals < oppGoals) return "bg-red-500";
  return "bg-orange-500";
}

function minuteSortValue(minute: string): number {
  const m = minute.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
}

const EVENT_ICON: Record<"goal" | "yellow_card" | "red_card", string> = {
  goal: "/icons/event-goal.png",
  yellow_card: "/icons/event-yellow-card.png",
  red_card: "/icons/event-red-card.png",
};

function EventDescription({ event, align }: { event: MatchEventEntry; align: "left" | "right" }) {
  const rowClass = `flex items-center gap-1.5 text-xs ${align === "right" ? "flex-row-reverse text-right" : "text-left"}`;
  if (event.type === "substitution") {
    const subIcon = align === "right" ? "/icons/event-sub-home.png" : "/icons/event-sub-away.png";
    return (
      <div className={rowClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={subIcon} alt="" className="w-7 h-7 shrink-0" />
        <span className={align === "right" ? "text-right" : "text-left"}>
          {event.subInPlayer && <span className="block text-emerald-600 dark:text-emerald-400 font-semibold">{event.subInPlayer}</span>}
          <span className="block text-red-500 dark:text-red-400">{event.player}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={rowClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={EVENT_ICON[event.type]} alt="" className="w-7 h-7 shrink-0" />
      <span className="text-gray-800 dark:text-gray-200 font-medium">{event.player}</span>
    </div>
  );
}

function EventRow({ event }: { event: MatchEventEntry & { side: "home" | "away" } }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div>{event.side === "home" && <EventDescription event={event} align="right" />}</div>
      <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-[#0e0e10] flex items-center justify-center text-[11px] font-bold text-gray-700 dark:text-gray-200">
        {event.minute}&apos;
      </div>
      <div>{event.side === "away" && <EventDescription event={event} align="left" />}</div>
    </div>
  );
}

function EventsTimeline({ home, away }: { home: MatchEventEntry[]; away: MatchEventEntry[] }) {
  const merged = [
    ...home.map((e) => ({ ...e, side: "home" as const })),
    ...away.map((e) => ({ ...e, side: "away" as const })),
  ].sort((a, b) => minuteSortValue(a.minute) - minuteSortValue(b.minute));

  if (merged.length === 0) return <p className="text-xs text-gray-500 dark:text-gray-400">No card or substitution events parsed for this match.</p>;

  const firstHalf = merged.filter((e) => parseInt(e.minute, 10) <= 45);
  const secondHalf = merged.filter((e) => parseInt(e.minute, 10) > 45);
  const htHome = firstHalf.filter((e) => e.side === "home" && e.type === "goal").length;
  const htAway = firstHalf.filter((e) => e.side === "away" && e.type === "goal").length;

  return (
    <div className="flex flex-col gap-2">
      {firstHalf.map((e, i) => (
        <EventRow key={`h1-${i}`} event={e} />
      ))}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2b30]" />
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
          HT {htHome} - {htAway}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2b30]" />
      </div>
      {secondHalf.map((e, i) => (
        <EventRow key={`h2-${i}`} event={e} />
      ))}
    </div>
  );
}

function TeamCrest({ url }: { url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="w-6 h-6 object-contain shrink-0" />;
  }
  return <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2a2b30] shrink-0" />;
}

export function MatchReportBrowser({ reports }: { reports: MatchReportDetail[] }) {
  const [mode, setMode] = useState<"matchday" | "overall">("matchday");
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"facts" | "lineup" | "stats" | "attackTypes" | "dynamics" | "passing" | "physical">("facts");
  const aggregate = useMemo(() => buildSeasonAggregate(reports), [reports]);

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 text-sm text-gray-500 dark:text-gray-400">
        No match reports imported yet. Use{" "}
        <a href="/match-reports/import" className="text-blue-600 dark:text-[#ffcf4d] font-semibold">
          Import Match Reports
        </a>{" "}
        first.
      </div>
    );
  }

  function toggleCategory(title: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function toggleMatch(id: number) {
    setExpandedMatchId((prev) => (prev === id ? null : id));
    setOpenCategories(new Set());
    setActiveTab("facts");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-xs font-semibold">
          <button
            onClick={() => setMode("matchday")}
            className={`px-3 py-1.5 ${
              mode === "matchday" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
            }`}
          >
            Per Matchday
          </button>
          <button
            onClick={() => setMode("overall")}
            className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
              mode === "overall" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
            }`}
          >
            Overall
          </button>
        </div>

      </div>

      {mode === "overall" && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            PSIM Yogyakarta average across {aggregate.matchesUsed} match{aggregate.matchesUsed === 1 ? "" : "es"} with imported reports, vs the average of
            the opponents faced.
          </p>
          <ComparisonRow label="Goals / Match" homeRaw={aggregate.goals?.psim.toFixed(2)} awayRaw={aggregate.goals?.opp.toFixed(2)} />
          <ComparisonRow label="xG / Match" homeRaw={aggregate.xg?.psim.toFixed(2)} awayRaw={aggregate.xg?.opp.toFixed(2)} />
          <ComparisonRow label="Possession %" homeRaw={aggregate.possession?.psim.toFixed(1)} awayRaw={aggregate.possession?.opp.toFixed(1)} />
          <div className="border-t border-gray-200 dark:border-[#2a2b30] my-3" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">Match Dynamics — Season Average</h4>
          <TimeSegmentChart homeTeam="PSIM average" awayTeam="Opponents average" home={aggregate.timeSegments.home} away={aggregate.timeSegments.away} />
        </div>
      )}

      {mode === "matchday" &&
        reports.map((report) => {
          const isOpen = expandedMatchId === report.matchId;
          return (
            <div key={report.matchId} className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg overflow-hidden flex flex-col">
              <div className="flex">
                <div className={`w-1.5 shrink-0 ${psimResultColor(report)}`} />
                <button onClick={() => toggleMatch(report.matchId)} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-5 text-left hover:bg-gray-50 dark:hover:bg-[#0e0e10]">
                  <div className="w-32 shrink-0 text-[10px] leading-tight">
                    <div className="whitespace-nowrap text-gray-700 dark:text-gray-300">{formatMatchDate(report.matchDate)}</div>
                    {report.round && <div className="text-gray-400 whitespace-nowrap mt-1">{gameWeekLabel(report.round)}</div>}
                  </div>
                  <div className="flex items-center flex-1 min-w-0 -ml-[145px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate text-right">{report.homeTeam}</span>
                      <TeamCrest url={report.homeLogoUrl} />
                    </div>
                    <div className="shrink-0 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#0e0e10] text-sm font-bold text-gray-900 dark:text-white min-w-[56px] text-center">
                      {report.homeScore ?? "–"}–{report.awayScore ?? "–"}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamCrest url={report.awayLogoUrl} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{report.awayTeam}</span>
                    </div>
                  </div>
                  <span className="text-gray-400 shrink-0 w-4 text-center">{isOpen ? "−" : "+"}</span>
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 dark:border-[#2a2b30]">
                  <div className="flex items-center gap-4 px-5 pt-3 border-b border-gray-100 dark:border-[#2a2b30] text-xs font-semibold">
                    {(
                      [
                        ["facts", "Facts"],
                        ["lineup", "Lineup"],
                        ["stats", "Stats"],
                        ["attackTypes", "Attack Types & Set Pieces"],
                        ["dynamics", "Match Dynamics"],
                        ["passing", "Pass Combinations"],
                        ["physical", "Physical Stats"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`pb-2.5 border-b-2 -mb-px ${
                          activeTab === key
                            ? "border-blue-600 dark:border-[#ffcf4d] text-gray-900 dark:text-white"
                            : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === "facts" && (
                      <>
                        {report.events ? (
                          <EventsTimeline home={report.events.home} away={report.events.away} />
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">No events parsed for this match.</p>
                        )}
                      </>
                    )}

                    {activeTab === "lineup" && (
                      <PitchLineup home={report.lineups?.home ?? []} away={report.lineups?.away ?? []} events={report.events} />
                    )}

                    {activeTab === "stats" && (
                      <>
          {(!report.home || !report.away) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              {!report.home && !report.away ? "No side has an imported report." : `${!report.home ? report.homeTeam : report.awayTeam} has no imported report — showing what's available.`}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-3">
            <span>{report.home?.scheme ?? "—"}</span>
            <span>{report.home?.duration ?? "—"}&apos; played</span>
            <span>{report.away?.scheme ?? "—"}</span>
          </div>

          <ComparisonRow label="Possession %" homeRaw={report.home?.possessionPct?.toString()} awayRaw={report.away?.possessionPct?.toString()} />
          <AccuracyDonuts homeStats={report.home?.stats} awayStats={report.away?.stats} />
          <div className="border-t border-gray-200 dark:border-[#2a2b30] my-2" />
          <ComparisonRow label="xG" homeRaw={report.home?.xg?.toString()} awayRaw={report.away?.xg?.toString()} />
          <ComparisonRow label="Goals" homeRaw={report.home?.goals?.toString()} awayRaw={report.away?.goals?.toString()} />
          {SUMMARY_KEYS.map((key) => (
            <ComparisonRow key={key} label={key} homeRaw={report.home?.stats[key]} awayRaw={report.away?.stats[key]} />
          ))}

          <div className="mt-3 flex flex-col gap-1.5">
            {CATEGORIES.map((cat) => {
              const isOpen = openCategories.has(cat.title);
              return (
                <div key={cat.title} className="border border-gray-200 dark:border-[#2a2b30] rounded-md">
                  <button
                    onClick={() => toggleCategory(cat.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200"
                  >
                    <span>{cat.title}</span>
                    <span className="text-gray-400">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      {cat.keys.map((key) => (
                        <ComparisonRow key={key} label={key} homeRaw={report.home?.stats[key]} awayRaw={report.away?.stats[key]} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
                      </>
                    )}

                    {activeTab === "attackTypes" && (
                      <div>
                        {ATTACK_TYPES_KEYS.map((key) => (
                          <ComparisonRow key={key} label={key} homeRaw={report.home?.stats[key]} awayRaw={report.away?.stats[key]} />
                        ))}
                      </div>
                    )}

                    {activeTab === "dynamics" && (
                      report.timeSegments ? (
                        <TimeSegmentChart
                          homeTeam={report.homeTeam}
                          awayTeam={report.awayTeam}
                          home={report.timeSegments.home}
                          away={report.timeSegments.away}
                          homeGoals={report.goals?.home}
                          awayGoals={report.goals?.away}
                        />
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No match dynamics data available.</p>
                      )
                    )}

                    {activeTab === "passing" && (
                      report.passNetwork ? (
                        <PassCombinationMatrix homeTeam={report.homeTeam} awayTeam={report.awayTeam} home={report.passNetwork.home} away={report.passNetwork.away} />
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No pass combination data available.</p>
                      )
                    )}

                    {activeTab === "physical" && (
                      report.psimPhysicalStats ? (
                        <PhysicalStatsTable players={report.psimPhysicalStats} />
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No physical stats data available.</p>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
