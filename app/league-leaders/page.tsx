// app/league-leaders/page.tsx
import { fetchLeagueTable } from "@/lib/scouting/queries";
import { fetchLeagueLeaders } from "@/lib/scouting/leagueLeaders";
import { LeagueLeadersBoard } from "@/components/leagueLeaders/LeagueLeadersBoard";
import { DashboardPageShell } from "@/components/DashboardPageShell";

export const revalidate = 300;

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export default async function LeagueLeadersPage() {
  const [players, teams] = await Promise.all([fetchLeagueLeaders(), fetchLeagueTable()]);

  // mv_players_complete's `team` spelling doesn't always exactly match
  // liga_1_2026_2027's `Team` (e.g. "Persita" vs "Persita Tangerang") — same
  // loose "one name prefixes the other" fallback used elsewhere for this.
  const logoByTeam = new Map<string, string | null>();
  for (const p of players) {
    const key = normalize(p.team);
    if (logoByTeam.has(key)) continue;
    const exact = teams.find((t) => normalize(t.Team) === key);
    const loose = exact ?? teams.find((t) => key.startsWith(normalize(t.Team)) || normalize(t.Team).startsWith(key));
    logoByTeam.set(key, loose?.logo_url ?? null);
  }

  const playersWithLogo = players.map((p) => ({ ...p, logoUrl: logoByTeam.get(normalize(p.team)) ?? null }));

  return (
    <DashboardPageShell
      title="League Leaders"
      description="BRI Super League 2026/2027 — every player ranked by stat category. Minimum 50 minutes played."
    >
      <LeagueLeadersBoard players={playersWithLogo} />
    </DashboardPageShell>
  );
}
