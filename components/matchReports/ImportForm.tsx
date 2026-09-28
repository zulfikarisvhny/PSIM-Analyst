// components/matchReports/ImportForm.tsx
"use client";
import { useState } from "react";

interface MatchReportMeta {
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string | null;
  matchDateIso: string | null;
  competition: string | null;
  round: string | null;
}

interface TimeSegmentMetric {
  metric: string;
  label: string;
  total: number | null;
  firstHalf: number | null;
  secondHalf: number | null;
  buckets: number[] | null;
}

interface PassPlayer {
  jersey: number;
  name: string;
  totalPasses: number;
}
interface TeamPassSummaryPreview {
  players: PassPlayer[];
  combinations: { fromJersey: number; toJersey: number; passCount: number }[];
  thirds: { def: number; mid: number; final: number } | null;
}

interface MatchEvent {
  type: "goal" | "yellow_card" | "red_card" | "substitution";
  minute: string;
  player: string;
  subInPlayer?: string;
}

interface PreviewResult {
  fileName: string;
  ok: boolean;
  error?: string;
  meta?: MatchReportMeta;
  teamStatsHome?: Record<string, string>;
  teamStatsAway?: Record<string, string>;
  timeSegments?: { home: TimeSegmentMetric[]; away: TimeSegmentMetric[] } | null;
  passCombinationsHome?: TeamPassSummaryPreview | null;
  passCombinationsAway?: TeamPassSummaryPreview | null;
  matchEvents?: { home: MatchEvent[]; away: MatchEvent[] };
}

const EVENT_LABEL: Record<MatchEvent["type"], string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "⇄",
};

const SEGMENT_COLUMNS = ["1-15", "16-30", "31-45+", "46-60", "61-75", "76-90+"];

interface ImportResult {
  fileName: string;
  ok: boolean;
  error?: string;
  matchLabel?: string;
  matchStatus?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  passCombinationsInserted?: number;
  passPlayersSkipped?: number;
  eventsInserted?: number;
}

const SUMMARY_KEYS = ["goals", "xg", "possession", "total_passes_accurate"];

export function ImportForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previews, setPreviews] = useState<PreviewResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});
  const [expandedPasses, setExpandedPasses] = useState<Record<string, boolean>>({});

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setPreviewing(true);
    setError(null);
    setPreviews(null);
    setImportResults(null);

    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    try {
      const res = await fetch("/api/match-reports/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Preview failed.");
      } else {
        setPreviews(body.results);
      }
    } catch {
      setError("Network error while uploading.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!previews) return;
    const okReports = previews.filter((p) => p.ok);
    if (okReports.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/match-reports/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: okReports }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Import failed.");
      } else {
        setImportResults(body.results);
      }
    } catch {
      setError("Network error while importing.");
    } finally {
      setImporting(false);
    }
  }

  function swapSegmentBucket(fileName: string, metricIndex: number, bucketIndex: number) {
    setPreviews((prev) => {
      if (!prev) return prev;
      return prev.map((p) => {
        if (p.fileName !== fileName || !p.timeSegments) return p;
        const homeMetric = p.timeSegments.home[metricIndex];
        const awayMetric = p.timeSegments.away[metricIndex];
        if (!homeMetric.buckets || !awayMetric.buckets) return p;
        const homeBuckets = [...homeMetric.buckets];
        const awayBuckets = [...awayMetric.buckets];
        const tmp = homeBuckets[bucketIndex];
        homeBuckets[bucketIndex] = awayBuckets[bucketIndex];
        awayBuckets[bucketIndex] = tmp;
        const home = p.timeSegments.home.map((m, i) => (i === metricIndex ? { ...m, buckets: homeBuckets } : m));
        const away = p.timeSegments.away.map((m, i) => (i === metricIndex ? { ...m, buckets: awayBuckets } : m));
        return { ...p, timeSegments: { home, away } };
      });
    });
  }

  const okPreviewCount = previews?.filter((p) => p.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handlePreview} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Match report PDFs</label>
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []));
              setPreviews(null);
              setImportResults(null);
            }}
            className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 dark:file:bg-[#ffcf4d] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white dark:file:text-[#0e0e10]"
          />
          {files.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {files.length} file{files.length > 1 ? "s" : ""} selected: {files.map((f) => f.name).join(", ")}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={previewing || files.length === 0}
          className="self-start text-sm font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-4 py-2 disabled:opacity-50"
        >
          {previewing ? "Extracting…" : "Preview extracted data"}
        </button>
      </form>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      {previews && !importResults && (
        <div className="flex flex-col gap-3">
          {previews.map((p) => (
            <div key={p.fileName} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md p-3">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">{p.fileName}</div>
              {!p.ok && <p className="text-xs text-red-500 dark:text-red-400">{p.error}</p>}
              {p.ok && p.meta && (
                <>
                  <p className="text-sm text-gray-900 dark:text-white font-semibold">
                    {p.meta.homeTeam} {p.meta.homeScore}–{p.meta.awayScore} {p.meta.awayTeam}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {p.meta.matchDateIso} · {p.meta.competition} · {p.meta.round}
                  </p>
                  {p.matchEvents && (p.matchEvents.home.length > 0 || p.matchEvents.away.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 text-[11px] mb-2">
                      {(["home", "away"] as const).map((side) => (
                        <div key={side} className="text-gray-600 dark:text-gray-300">
                          {p.matchEvents![side].map((e, i) => (
                            <div key={i}>
                              {EVENT_LABEL[e.type]} {e.minute}&apos; {e.type === "substitution" ? `${e.subInPlayer ?? "?"} ↔ ${e.player}` : e.player}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {(expanded[p.fileName] ? Object.keys(p.teamStatsHome ?? {}) : SUMMARY_KEYS).map((key) => (
                      <div key={key} className="contents">
                        <div className="text-gray-500 dark:text-gray-400 col-span-2 mt-1 font-semibold uppercase tracking-wide">{key}</div>
                        <div className="text-gray-900 dark:text-white">{p.teamStatsHome?.[key] ?? "—"}</div>
                        <div className="text-gray-900 dark:text-white">{p.teamStatsAway?.[key] ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [p.fileName]: !prev[p.fileName] }))}
                    className="text-xs font-semibold text-blue-600 dark:text-[#ffcf4d] mt-3"
                  >
                    {expanded[p.fileName] ? "Show fewer stats" : `Show all ${Object.keys(p.teamStatsHome ?? {}).length} stats`}
                  </button>

                  {p.timeSegments && (
                    <div className="mt-3 border-t border-gray-200 dark:border-[#2a2b30] pt-3">
                      <button
                        onClick={() => setExpandedSegments((prev) => ({ ...prev, [p.fileName]: !prev[p.fileName] }))}
                        className="text-xs font-semibold text-blue-600 dark:text-[#ffcf4d]"
                      >
                        {expandedSegments[p.fileName] ? "Hide match dynamics (time segments)" : "Show match dynamics (time segments)"}
                      </button>
                      {expandedSegments[p.fileName] && (
                        <div className="mt-2 flex flex-col gap-3">
                          {p.timeSegments.home.map((homeMetric, i) => {
                            const awayMetric = p.timeSegments!.away[i];
                            return (
                              <div key={homeMetric.metric}>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  {homeMetric.label}
                                </div>
                                <table className="w-full text-[11px] mt-1">
                                  <thead>
                                    <tr className="text-gray-400 dark:text-gray-500">
                                      <th className="text-left font-normal"> </th>
                                      {SEGMENT_COLUMNS.map((c) => (
                                        <th key={c} className="text-right font-normal px-1">
                                          {c}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="text-gray-900 dark:text-white">
                                      <td>{p.meta?.homeTeam}</td>
                                      {(homeMetric.buckets ?? SEGMENT_COLUMNS.map(() => null)).map((v, j) => (
                                        <td key={j} className="text-right px-1">
                                          {v ?? "—"}
                                        </td>
                                      ))}
                                    </tr>
                                    <tr className="text-gray-900 dark:text-white">
                                      <td>{p.meta?.awayTeam}</td>
                                      {(awayMetric.buckets ?? SEGMENT_COLUMNS.map(() => null)).map((v, j) => (
                                        <td key={j} className="text-right px-1">
                                          {v ?? "—"}
                                        </td>
                                      ))}
                                    </tr>
                                    {homeMetric.buckets && awayMetric.buckets && (
                                      <tr>
                                        <td></td>
                                        {SEGMENT_COLUMNS.map((_, j) => (
                                          <td key={j} className="text-right px-1">
                                            <button
                                              type="button"
                                              onClick={() => swapSegmentBucket(p.fileName, i, j)}
                                              title="Tim tertukar di segmen ini? Klik untuk tukar."
                                              className="text-gray-400 hover:text-blue-600 dark:hover:text-[#ffcf4d]"
                                            >
                                              ⇄
                                            </button>
                                          </td>
                                        ))}
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {(p.passCombinationsHome || p.passCombinationsAway) && (
                    <div className="mt-3 border-t border-gray-200 dark:border-[#2a2b30] pt-3">
                      <button
                        onClick={() => setExpandedPasses((prev) => ({ ...prev, [p.fileName]: !prev[p.fileName] }))}
                        className="text-xs font-semibold text-blue-600 dark:text-[#ffcf4d]"
                      >
                        {expandedPasses[p.fileName] ? "Hide pass combinations" : "Show pass combinations"}
                      </button>
                      {expandedPasses[p.fileName] && (
                        <div className="mt-2 flex flex-col gap-3 text-[11px]">
                          {[
                            { label: p.meta?.homeTeam, summary: p.passCombinationsHome },
                            { label: p.meta?.awayTeam, summary: p.passCombinationsAway },
                          ].map(({ label, summary }) =>
                            summary ? (
                              <div key={label}>
                                <div className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                  {label} — {summary.players.length} players, {summary.combinations.length} combinations
                                  {summary.thirds && (
                                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                                      {" "}
                                      (thirds: def {summary.thirds.def}% / mid {summary.thirds.mid}% / final {summary.thirds.final}%)
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                  {summary.players.map((pl) => (
                                    <div key={pl.jersey} className="flex justify-between text-gray-600 dark:text-gray-300">
                                      <span>
                                        {pl.jersey} {pl.name}
                                      </span>
                                      <span className="font-semibold">{pl.totalPasses}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {okPreviewCount > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="self-start text-sm font-bold bg-emerald-600 text-white rounded-md px-4 py-2 disabled:opacity-50"
            >
              {importing ? "Importing…" : `Import ${okPreviewCount} report${okPreviewCount > 1 ? "s" : ""} to database`}
            </button>
          )}
        </div>
      )}

      {importResults && (
        <div className="flex flex-col gap-1.5">
          {importResults.map((r) => (
            <div
              key={r.fileName}
              className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-xs"
            >
              <span className="text-gray-700 dark:text-gray-200">{r.fileName}</span>
              {r.ok ? (
                <span className="text-emerald-600 dark:text-emerald-400 text-right">
                  {r.matchLabel} ({r.homeScore}–{r.awayScore}) — {r.matchStatus}
                  {typeof r.passCombinationsInserted === "number" && (
                    <>
                      {" · "}
                      {r.passCombinationsInserted} pass combos
                      {!!r.passPlayersSkipped && <span className="text-amber-600 dark:text-amber-400"> ({r.passPlayersSkipped} players skipped, name not matched)</span>}
                    </>
                  )}
                  {typeof r.eventsInserted === "number" && r.eventsInserted > 0 && (
                    <>
                      {" · "}
                      {r.eventsInserted} event{r.eventsInserted > 1 ? "s" : ""}
                    </>
                  )}
                </span>
              ) : (
                <span className="text-red-500 dark:text-red-400 text-right">{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
