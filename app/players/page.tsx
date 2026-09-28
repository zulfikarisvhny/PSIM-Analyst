// app/players/page.tsx
import { fetchPsimPlayerPool } from "@/lib/scouting/psimPlayers";
import { PlayerBrowser } from "@/components/players/PlayerBrowser";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

const PSIM = "PSIM Yogyakarta";

export default async function PlayersPage() {
  let pool: Awaited<ReturnType<typeof fetchPsimPlayerPool>> = [];
  let error: string | null = null;
  try {
    pool = await fetchPsimPlayerPool();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const teamPlayers = pool.filter((p) => p.team === PSIM);

  return (
    <DashboardPageShell
      title="Player Profiles"
      maxWidthClassName="max-w-5xl"
      description="PSIM Yogyakarta squad, compared per-position against the league-wide pool. Click a player for the full breakdown."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-sm text-red-600 mb-6">
          Could not load player data: {error}
        </div>
      )}

      {!error && teamPlayers.length === 0 && (
        <div className={`${shell.card} p-5 text-sm text-gray-500`}>No players found for {PSIM} in player_season_stats yet.</div>
      )}

      {teamPlayers.length > 0 && <PlayerBrowser players={teamPlayers} leaguePool={pool} />}
    </DashboardPageShell>
  );
}
