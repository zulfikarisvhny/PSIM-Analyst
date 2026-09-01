// app/page.tsx
import { fetchLeagueTable } from "@/lib/scouting/queries";
import { TeamPicker } from "@/components/TeamPicker";
import { ThemeToggle } from "@/components/ThemeToggle";

export const revalidate = 300;

// Teams with a fully built-out scouting report (match log, roster,
// formation analysis, squad updates). Other teams in liga_1_2026_2027 only
// have the generic league-table/style-map tabs — still browsable below.
const FEATURED_TEAMS = ["Persita Tangerang", "Bhayangkara Presisi FC"];

export default async function HomePage() {
  const rows = await fetchLeagueTable();
  const teamNames = rows.map((r) => r.Team);
  const featured = FEATURED_TEAMS.filter((t) => teamNames.includes(t));

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 bg-gray-50 dark:bg-[#0e0e10] text-gray-900 dark:text-white min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-extrabold">Opponent Analyst</h1>
        <ThemeToggle />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Pick a team to view its scouting report.</p>

      <TeamPicker teams={featured.length > 0 ? featured : teamNames} />

      <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-10 mb-3">All Teams in the League</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((r) => (
          <a
            key={r.Team}
            href={`/scouting/${encodeURIComponent(r.Team)}`}
            className="flex items-center gap-3 bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg px-4 py-3 hover:border-blue-600/40 dark:hover:border-[#ffcf4d]/40"
          >
            {r.logo_url ? (
              <img src={r.logo_url} alt="" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#2a2b30]" />
            )}
            <span className="text-sm font-semibold">{r.Team}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
