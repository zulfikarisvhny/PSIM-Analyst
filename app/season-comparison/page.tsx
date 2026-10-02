// app/season-comparison/page.tsx
import { fetchLastSeasonOverview } from "@/lib/scouting/lastSeasonOverview";
import { fetchPointsProgression } from "@/lib/scouting/pointsProgression";
import { fetchSeasonStatComparison } from "@/lib/scouting/seasonStatComparison";
import { PointsProgressionChart } from "@/components/style/PointsProgressionChart";
import { SeasonStatComparisonCard } from "@/components/style/SeasonStatComparisonCard";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

const PSIM = "PSIM Yogyakarta";

export default async function SeasonComparisonPage() {
  const [lastSeason, pointsProgression, seasonStatComparison] = await Promise.all([
    fetchLastSeasonOverview(PSIM),
    fetchPointsProgression(PSIM),
    fetchSeasonStatComparison(PSIM),
  ]);

  return (
    <DashboardPageShell
      title="Season Comparison"
      description="PSIM Yogyakarta — 2026/2027 so far vs the full 2025/2026 season."
    >
      {lastSeason && (
        <div className={`${shell.card} p-5 mb-6`}>
          <h2 className="text-sm font-bold text-[#121b2d] mb-3">Last Season ({lastSeason.season}) Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Record</div>
              <div className="font-bold text-[#121b2d]">
                {lastSeason.wins}W {lastSeason.draws}D {lastSeason.losses}L
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Goals</div>
              <div className="font-bold text-[#121b2d]">
                {lastSeason.goalsFor} - {lastSeason.goalsAgainst}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Possession</div>
              <div className="font-bold text-[#121b2d]">{lastSeason.possessionPct?.toFixed(1) ?? "—"}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Pass Accuracy</div>
              <div className="font-bold text-[#121b2d]">{lastSeason.passAccuracyPct?.toFixed(1) ?? "—"}%</div>
            </div>
          </div>
        </div>
      )}

      <div className={`${shell.card} p-5 mb-6`}>
        <PointsProgressionChart data={pointsProgression} />
      </div>

      <div className={`${shell.card} p-5`}>
        <h2 className="text-sm font-bold text-[#121b2d] mb-3">Match Stats — This Season vs Last Season</h2>
        <SeasonStatComparisonCard rows={seasonStatComparison} />
      </div>
    </DashboardPageShell>
  );
}
