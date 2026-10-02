// app/league-leaders/page.tsx
import { fetchLeagueLeaders } from "@/lib/scouting/leagueLeaders";
import { LeagueLeadersBoard } from "@/components/leagueLeaders/LeagueLeadersBoard";
import { DashboardPageShell } from "@/components/DashboardPageShell";

export const revalidate = 60;

export default async function LeagueLeadersPage() {
  const players = await fetchLeagueLeaders();

  return (
    <DashboardPageShell
      title="League Leaders"
      description="Every player ranked by stat category — built from real imported match reports, so coverage grows as more are uploaded."
    >
      <LeagueLeadersBoard players={players} />
    </DashboardPageShell>
  );
}
