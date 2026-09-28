// app/page.tsx
import { fetchLeagueTable } from "@/lib/scouting/queries";
import { fetchPsimStandings } from "@/lib/scouting/psimStandings";
import { fetchTeamStyleStats } from "@/lib/scouting/psimStyleStats";
import { fetchAllMatchReports } from "@/lib/scouting/matchReportsBrowse";
import { fetchLastSeasonOverview } from "@/lib/scouting/lastSeasonOverview";
import { fetchPointsProgression } from "@/lib/scouting/pointsProgression";
import { fetchSeasonStatComparison } from "@/lib/scouting/seasonStatComparison";
import { fetchSchedule } from "@/lib/scouting/schedule";
import { PsimOverview } from "@/components/PsimOverview";

const PSIM = "PSIM Yogyakarta";

export const revalidate = 60;

export default async function HomePage() {
  const [rows, standings, styleStats, matchReports, lastSeason, pointsProgression, seasonStatComparison, schedule] = await Promise.all([
    fetchLeagueTable(),
    fetchPsimStandings(),
    fetchTeamStyleStats(),
    fetchAllMatchReports(),
    fetchLastSeasonOverview(PSIM),
    fetchPointsProgression(PSIM),
    fetchSeasonStatComparison(PSIM),
    fetchSchedule(PSIM),
  ]);

  const psimRow = rows.find((r) => r.Team === PSIM);
  const psimStanding = standings.find((s) => s.team === PSIM);
  const teamRank = psimStanding ? standings.findIndex((s) => s.team === PSIM) + 1 : 0;
  const teamPoints = psimStanding?.points ?? 0;

  return (
    <PsimOverview
      rows={rows}
      psimRow={psimRow}
      teamRank={teamRank}
      teamPoints={teamPoints}
      styleStats={styleStats}
      matchReports={matchReports}
      lastSeason={lastSeason}
      pointsProgression={pointsProgression}
      seasonStatComparison={seasonStatComparison}
      schedule={schedule}
      standings={standings}
    />
  );
}
