// components/PsimOverview.tsx
"use client";
import Link from "next/link";
import { LeagueTeamRow } from "@/lib/scouting/types";
import type { TeamStyleRow } from "@/lib/scouting/psimStyleStats";
import { QuickStats } from "@/components/scouting/QuickStats";
import { StyleComparison } from "@/components/style/StyleComparison";
import { MatchReportBrowser } from "@/components/matchReports/MatchReportBrowser";
import type { MatchReportDetail } from "@/lib/scouting/matchReportsBrowse";
import type { LastSeasonOverview } from "@/lib/scouting/lastSeasonOverview";
import type { PointsProgressionPoint } from "@/lib/scouting/pointsProgression";
import { PointsProgressionChart } from "@/components/style/PointsProgressionChart";
import type { SeasonStatComparisonRow } from "@/lib/scouting/seasonStatComparison";
import type { ScheduleData } from "@/lib/scouting/schedule";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import type { PsimStandingRow } from "@/lib/scouting/psimStandings";
import { LeagueStandingsCard } from "@/components/scouting/LeagueStandingsCard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ImportDataMenu } from "@/components/ImportDataMenu";
import shell from "@/components/DashboardShell.module.css";

const PSIM = "PSIM Yogyakarta";

type Feature = {
  title: string;
  description: string;
  href?: string;
  icon: string;
};

const FEATURES: Feature[] = [
  {
    title: "Opponent Analysis",
    description: "Pick any club in the league and turn its match data into a scouting report.",
    href: "/opponent-analysis",
    icon: "🔎",
  },
  {
    title: "Player Profiles",
    description: "Technical stats per player — physical (Catapult) data coming soon.",
    href: `/scouting/${encodeURIComponent(PSIM)}`,
    icon: "🧑‍🤝‍🧑",
  },
  {
    title: "Season Comparison",
    description: "PSIM this season vs last season — points progression and match stats.",
    href: "/season-comparison",
    icon: "📈",
  },
  {
    title: "Performance Evaluation",
    description: "Coach/analyst notes on attacking, defensive, and transition patterns.",
    icon: "🧩",
  },
  {
    title: "Team Dynamics",
    description: "Squad psychology and dynamics notes.",
    icon: "🤝",
  },
  {
    title: "Training & Periodization",
    description: "Training log and periodization routine.",
    icon: "🏋️",
  },
  {
    title: "Strategic Recommendations",
    description: "Action items and next steps after evaluation.",
    icon: "🎯",
  },
];

export function PsimOverview({
  rows,
  psimRow,
  teamRank,
  teamPoints,
  styleStats,
  matchReports,
  lastSeason,
  pointsProgression,
  seasonStatComparison,
  schedule,
  standings,
}: {
  rows: LeagueTeamRow[];
  psimRow: LeagueTeamRow | undefined;
  teamRank: number;
  teamPoints: number;
  styleStats: TeamStyleRow[];
  matchReports: MatchReportDetail[];
  lastSeason: LastSeasonOverview | null;
  pointsProgression: PointsProgressionPoint[];
  seasonStatComparison: SeasonStatComparisonRow[];
  schedule: ScheduleData;
  standings: PsimStandingRow[];
}) {
  return (
    <main className={shell.page}>
      <div className={shell.blueField} aria-hidden="true" />
      <div className={shell.navySlice} aria-hidden="true" />
      <div className={shell.grain} aria-hidden="true" />

      <nav className={shell.nav}>
        <Link href="/" className={shell.brand}>
          {psimRow?.logo_url && <img src={psimRow.logo_url} alt="" className={shell.brandCrest} />}
          <b>PSIM Intelligence Dashboard</b>
        </Link>
        <div className={shell.navLinks}>
          <a className={shell.active}>Overview</a>
          <ImportDataMenu />
          <Link href="/players">Player Profiles (New)</Link>
        </div>
        <div className={shell.navRight}>
          <LogoutButton />
        </div>
      </nav>

      <div className="relative z-[1] max-w-[1500px] mx-auto px-3 sm:px-6 py-8">
        <div className={`${shell.card} flex items-center gap-4 mb-8 p-5`}>
          <div className="w-16 h-16 rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden shrink-0">
            {psimRow?.logo_url ? (
              <img src={psimRow.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-600 font-extrabold text-sm">PSIM</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-[#121b2d]">PSIM Yogyakarta</h1>
            <p className="text-gray-500 text-sm mt-0.5">BRI Super League</p>
          </div>
          {psimRow && (
            <span className="text-xs px-3.5 py-1.5 rounded-full border border-gray-200 text-gray-500 shrink-0">
              Rank {teamRank} · {teamPoints} Pts
            </span>
          )}
        </div>

        {psimRow && <h2 className={`text-lg mb-4 ${shell.sectionTitle}`}>Overview</h2>}

        {psimRow && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 mb-10 items-start">
            <div className="flex flex-col gap-4">
              <QuickStats rows={rows} focusTeam={PSIM} lastSeason={lastSeason} seasonStatComparison={seasonStatComparison} />
              <LeagueStandingsCard standings={standings} focusTeam={PSIM} />
            </div>
            <ScheduleCalendar data={schedule} />
          </div>
        )}

        <h2 className={`text-lg mb-4 ${shell.sectionTitle}`}>Season Progression</h2>
        <div className={`${shell.card} p-5 mb-10`}>
          <PointsProgressionChart data={pointsProgression} />
        </div>

        <h2 className={`text-lg mb-4 ${shell.sectionTitle}`}>PSIM Style to Play</h2>
        <div className="mb-6">
          <StyleComparison rows={styleStats} />
        </div>
        <h2 className={`text-lg mb-4 ${shell.sectionTitle}`}>Match Reports</h2>
        <div className="mb-10">
          <MatchReportBrowser reports={matchReports} />
        </div>

        <h2 className={`text-lg mb-4 ${shell.sectionTitle}`}>Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) =>
            f.href ? (
              <Link key={f.title} href={f.href} className={`${shell.card} p-5 block hover:-translate-y-0.5 transition-transform`}>
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-sm font-bold text-[#121b2d] mt-3 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </Link>
            ) : (
              <div key={f.title} title="Coming soon" className="bg-gray-50 border border-dashed border-gray-200 rounded-[14px] p-5 opacity-70 cursor-not-allowed">
                <span className="text-2xl grayscale">{f.icon}</span>
                <h3 className="text-sm font-bold text-gray-700 mt-3 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Coming soon</span>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
