// app/physical-stats/compare/page.tsx
import { fetchPhysicalStatsSessions, fetchPhysicalStatsCompare } from "@/lib/physicalStats/fetchPhysicalStatsCompare";
import { CompareTable } from "@/components/physicalStats/CompareTable";
import { DashboardPageShell } from "@/components/DashboardPageShell";

function parseKey(key: string | undefined): { sessionDate: string; sessionType: string } | null {
  if (!key) return null;
  const [sessionDate, sessionType] = key.split("|");
  if (!sessionDate || !sessionType) return null;
  return { sessionDate, sessionType };
}

export default async function PhysicalStatsComparePage({ searchParams }: { searchParams: { a?: string; b?: string } }) {
  const sessions = await fetchPhysicalStatsSessions();
  const a = parseKey(searchParams.a);
  const b = parseKey(searchParams.b);
  const result = a && b ? await fetchPhysicalStatsCompare(a, b) : null;

  return (
    <DashboardPageShell
      title="Compare Training GPS"
      maxWidthClassName="max-w-4xl"
      description="Pick two imported sessions (Team Summary totals) and compare player-by-player and team-average GPS output."
    >
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No GPS sessions imported yet — upload one at /physical-stats/import first.</p>
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-3 mb-8">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Session A</label>
              <select name="a" defaultValue={searchParams.a ?? ""} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm">
                <option value="" disabled>
                  — pick a session —
                </option>
                {sessions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.sessionDate} — {s.sessionType} ({s.playerCount} players)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Session B</label>
              <select name="b" defaultValue={searchParams.b ?? ""} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm">
                <option value="" disabled>
                  — pick a session —
                </option>
                {sessions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.sessionDate} — {s.sessionType} ({s.playerCount} players)
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="text-sm font-bold bg-blue-600 text-white rounded-md px-4 py-1.5">
              Compare
            </button>
          </form>

          {result && a && b && <CompareTable labelA={a.sessionDate} labelB={b.sessionDate} rows={result.rows} teamAverage={result.teamAverage} />}
          {(!a || !b) && <p className="text-sm text-gray-400">Pick two sessions above to compare.</p>}
        </>
      )}
    </DashboardPageShell>
  );
}
