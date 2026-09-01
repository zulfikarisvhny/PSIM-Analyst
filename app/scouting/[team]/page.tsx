// app/scouting/[team]/page.tsx
import { fetchLeagueTable, computeRadarPercentiles } from "@/lib/scouting/queries";
import { fetchTeamPlayers, fetchLeaguePositionAverages, fetchLeaguePlayerProfilePool, fetchPlayersByExactName, NexusPlayerRow } from "@/lib/scouting/players";
import { NEW_SIGNEES } from "@/lib/scouting/squadUpdate";
import { NEW_SIGNEES_BY_TEAM } from "@/lib/scouting/newSignees";
import { MATCH_LOG_BY_TEAM } from "@/lib/scouting/matchlog";
import { ScoutingTabs } from "@/components/scouting/ScoutingTabs";

// Cache the rendered page for 5 min so visits are served instantly instead of
// re-querying Supabase every time; data can lag up to 5 min behind Supabase.
export const revalidate = 300;

export default async function ScoutingPage({
  params,
}: {
  params: { team: string };
}) {
  const focusTeam = decodeURIComponent(params.team); // e.g. "Bhayangkara Presisi FC"
  // NEW_SIGNEES (squadUpdate.ts) feeds the Bhayangkara-only "Update Skuad" tab.
  const newSigneeNames = NEW_SIGNEES.map((s) => s.nexusName).filter((n): n is string => !!n);
  // NEW_SIGNEES_BY_TEAM is generic per-team — feeds the Formation Analysis
  // lineup picker so freshly-signed players are selectable even before
  // Nexus has them tagged to their new club.
  const formationSignees = NEW_SIGNEES_BY_TEAM[focusTeam] ?? [];
  const formationSigneeNexusNames = formationSignees.map((s) => s.nexusName).filter((n): n is string => !!n);

  // These 6 queries are independent — run them in parallel instead of one
  // sequential await each, which was serializing network round-trips to Supabase.
  const [rows, players, leaguePositionAverages, leagueDefenderPool, incomingPlayers, formationSigneeNexusRows] = await Promise.all([
    fetchLeagueTable(),
    fetchTeamPlayers(focusTeam),
    fetchLeaguePositionAverages(),
    fetchLeaguePlayerProfilePool(),
    fetchPlayersByExactName(newSigneeNames),
    fetchPlayersByExactName(formationSigneeNexusNames),
  ]);

  // Signees with real Nexus history (found above) plus synthetic placeholder
  // rows (negative ids) for those with none at all — merged into the roster
  // handed to Formation Analysis only, so zero-stat placeholders don't leak
  // into Player Stats / radar averages elsewhere.
  const foundNexusNames = new Set(formationSigneeNexusRows.map((p) => p.player_name));
  const placeholderSignees: NexusPlayerRow[] = formationSignees
    .filter((s) => !s.nexusName || !foundNexusNames.has(s.nexusName))
    .map((s, i) => ({
      player_master_id: -1000 - i,
      player_name: s.name,
      team: focusTeam,
      position_group: s.positionGroup,
      position_raw: null,
      secondary_role: null,
      role_label: null,
      age: null,
      height_cm: null,
      foot: null,
      matches_played: 0,
      minutes_played: 0,
      goals: 0,
      assists: 0,
      xg: 0,
      xa: 0,
    }));
  // Dedup by player_master_id — some signees (e.g. academy graduates already
  // tagged directly to this team) are returned by both fetchTeamPlayers and
  // fetchPlayersByExactName; keep one row each for the lineup picker.
  const formationPlayersByMaster = new Map<number, NexusPlayerRow>();
  for (const p of [...players, ...formationSigneeNexusRows, ...placeholderSignees]) {
    formationPlayersByMaster.set(p.player_master_id, p);
  }
  const formationPlayers: NexusPlayerRow[] = Array.from(formationPlayersByMaster.values());

  const percentiles = computeRadarPercentiles(rows);
  const teamOptions = rows.map((r) => r.Team).filter((t) => t !== focusTeam);
  const focusRow = rows.find((r) => r.Team === focusTeam);
  const teamRank = rows.findIndex((r) => r.Team === focusTeam) + 1;
  const teamPoints = focusRow ? focusRow.W * 3 + focusRow.D : 0;
  const hasMatchLog = focusTeam in MATCH_LOG_BY_TEAM;
  // TacticalNotes is hand-written scouting prose, currently only authored for Bhayangkara.
  const hasSquadNotes = focusTeam === "Bhayangkara Presisi FC";
  // Update Skuad shows either the full Bhayangkara SquadUpdate (departed
  // players, repositioning) or, for any team with NEW_SIGNEES_BY_TEAM data,
  // the lighter NewSigneeProfiles view.
  const hasNewSignees = hasSquadNotes || formationSignees.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 bg-gray-50 dark:bg-[#0e0e10] text-gray-900 dark:text-white min-h-screen">
      <ScoutingTabs
        rows={rows}
        percentiles={percentiles}
        focusTeam={focusTeam}
        teamOptions={teamOptions}
        hasMatchLog={hasMatchLog}
        hasSquadNotes={hasSquadNotes}
        hasNewSignees={hasNewSignees}
        formationSignees={formationSignees}
        focusRow={focusRow}
        teamRank={teamRank}
        teamPoints={teamPoints}
        players={players}
        formationPlayers={formationPlayers}
        leaguePositionAverages={leaguePositionAverages}
        leagueDefenderPool={leagueDefenderPool}
        incomingPlayers={incomingPlayers}
      />

      {/* Tactical notes: pull from a future `scouting_intel` table once it exists;
          hardcode or CMS-source for now */}
    </div>
  );
}
