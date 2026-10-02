// app/physical-stats/compare/page.tsx
import Link from "next/link";
import { fetchPhysicalStatsSessions, fetchPhysicalStatsCompare, fetchPhysicalStatsDrillOptions, type SideStats } from "@/lib/physicalStats/fetchPhysicalStatsCompare";
import { CompareTable } from "@/components/physicalStats/CompareTable";
import { CompareChart } from "@/components/physicalStats/CompareChart";
import { DashboardPageShell } from "@/components/DashboardPageShell";

function parseKey(key: string | undefined): { sessionDate: string; sessionType: string } | null {
  if (!key) return null;
  const [sessionDate, sessionType] = key.split("|");
  if (!sessionDate || !sessionType) return null;
  return { sessionDate, sessionType };
}

const CHART_METRICS: { key: keyof SideStats; label: string; decimals?: number; higherIsBetter?: boolean }[] = [
  { key: "totalDistanceM", label: "Distance (m)" },
  { key: "highSpeedRunningM", label: "HSR (m)" },
  { key: "sprintDistanceM", label: "Sprint (m)" },
  { key: "topSpeedKmh", label: "Top Speed (km/h)", decimals: 1 },
  { key: "accelerations", label: "Accelerations" },
  { key: "decelerations", label: "Decelerations", higherIsBetter: false },
  { key: "minutesPlayed", label: "Minutes" },
];

export default async function PhysicalStatsComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string; scope?: string; view?: string; metric?: string };
}) {
  const sessions = await fetchPhysicalStatsSessions();
  const a = parseKey(searchParams.a);
  const b = parseKey(searchParams.b);
  const scope = searchParams.scope && searchParams.scope !== "__overall__" ? searchParams.scope : null;
  const view = searchParams.view === "chart" ? "chart" : "table";
  const metric = CHART_METRICS.find((m) => m.key === searchParams.metric) ?? CHART_METRICS[0];

  const drillOptions = a && b ? await fetchPhysicalStatsDrillOptions(a, b) : [];
  const result = a && b ? await fetchPhysicalStatsCompare(a, b, scope) : null;

  function viewLink(nextView: string) {
    const params = new URLSearchParams({ a: searchParams.a ?? "", b: searchParams.b ?? "", scope: searchParams.scope ?? "__overall__", view: nextView });
    if (searchParams.metric) params.set("metric", searchParams.metric);
    return `?${params.toString()}`;
  }

  return (
    <DashboardPageShell
      title="Compare Training GPS"
      description="Pick two imported sessions and compare player-by-player and team-average GPS output, overall or for one matched drill/period."
    >
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No GPS sessions imported yet — upload one at /physical-stats/import first.</p>
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
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

          {a && b && (
            <form method="get" className="flex flex-wrap items-end gap-3 mb-8">
              <input type="hidden" name="a" value={searchParams.a} />
              <input type="hidden" name="b" value={searchParams.b} />
              <input type="hidden" name="view" value={view} />
              {view === "chart" && <input type="hidden" name="metric" value={metric.key} />}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Scope</label>
                <select name="scope" defaultValue={scope ?? "__overall__"} className="bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm">
                  <option value="__overall__">Overall (whole session)</option>
                  {drillOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {drillOptions.length === 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">No matching drill name in both sessions — rename drills consistently on import to compare them here.</p>
                )}
              </div>
              <button type="submit" className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-md px-3 py-1.5">
                Apply
              </button>
              <div className="ml-auto flex items-center rounded-md border border-gray-200 overflow-hidden text-xs font-semibold">
                <Link href={viewLink("table")} className={`px-3 py-1.5 ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>
                  Table
                </Link>
                <Link href={viewLink("chart")} className={`px-3 py-1.5 border-l border-gray-200 ${view === "chart" ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>
                  Chart
                </Link>
              </div>
            </form>
          )}

          {result && a && b && view === "table" && <CompareTable labelA={a.sessionDate} labelB={b.sessionDate} rows={result.rows} teamAverage={result.teamAverage} />}

          {result && a && b && view === "chart" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                {CHART_METRICS.map((m) => (
                  <Link
                    key={m.key}
                    href={`?${new URLSearchParams({ a: searchParams.a!, b: searchParams.b!, scope: searchParams.scope ?? "__overall__", view: "chart", metric: m.key }).toString()}`}
                    className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
                      metric.key === m.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {m.label}
                  </Link>
                ))}
              </div>
              <CompareChart
                labelA={a.sessionDate}
                labelB={b.sessionDate}
                rows={result.rows}
                metric={metric.key}
                decimals={metric.decimals ?? 0}
                higherIsBetter={metric.higherIsBetter ?? true}
              />
            </div>
          )}

          {(!a || !b) && <p className="text-sm text-gray-400">Pick two sessions above to compare.</p>}
        </>
      )}
    </DashboardPageShell>
  );
}
