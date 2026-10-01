// components/physicalStats/ImportForm.tsx
"use client";
import { useState } from "react";

interface PlayerMatch {
  playerId: number | null;
  matchedName: string | null;
  confidence: "exact" | "surname" | "fuzzy" | "none";
}

interface RosterOption {
  id: number;
  name: string;
}

interface MatchOption {
  id: number;
  label: string;
  matchDate: string | null;
}

interface CatapultPlayerRow {
  playerNameRaw: string;
  drill: string | null; // null = Team Summary (whole session); else e.g. "1st GAME", "WARM UP", "HSR"
  durationSeconds: number | null;
  totalDistanceM: number | null;
  distPerMin: number | null;
  maxVelocityKmh: number | null;
  hsDistanceM: number | null;
  sprintDistanceM: number | null;
  playerLoad: number | null;
  accelerations: number | null;
  decelerations: number | null;
  totalJumps: number | null;
  runningImbalancePct: number | null;
  runningImbalanceSide: string | null;
  match: PlayerMatch;
}

/** Groups a file's flat player-row list by drill, Team Summary (drill: null) first, then each drill in first-seen order. */
function groupByDrill(players: CatapultPlayerRow[]): { drill: string | null; rows: CatapultPlayerRow[] }[] {
  const order: (string | null)[] = [];
  const byDrill = new Map<string | null, CatapultPlayerRow[]>();
  for (const p of players) {
    if (!byDrill.has(p.drill)) {
      order.push(p.drill);
      byDrill.set(p.drill, []);
    }
    byDrill.get(p.drill)!.push(p);
  }
  return order.map((drill) => ({ drill, rows: byDrill.get(drill)! }));
}

interface CatapultMeta {
  clubName: string | null;
  sessionDate: string | null;
  sessionDateIso: string | null;
  sessionType: string;
}

interface PreviewResult {
  fileName: string;
  ok: boolean;
  error?: string;
  meta?: CatapultMeta;
  players?: CatapultPlayerRow[];
  roster?: RosterOption[];
  matches?: MatchOption[];
  suggestedMatchId?: number | null;
}

interface ImportResult {
  fileName: string;
  ok: boolean;
  error?: string;
  clubName?: string;
  sessionDateIso?: string;
  playerCount?: number;
  unmatchedCount?: number;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function confidenceColor(confidence: PlayerMatch["confidence"]): string {
  if (confidence === "exact") return "text-emerald-600 dark:text-emerald-400";
  if (confidence === "none") return "text-red-500 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400"; // surname / fuzzy — worth a glance
}

export function ImportForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previews, setPreviews] = useState<PreviewResult[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionTypeOverride, setSessionTypeOverride] = useState<Record<string, string>>({});
  // fileName -> playerNameRaw -> playerId override (null = "no match" explicitly chosen)
  const [playerIdOverride, setPlayerIdOverride] = useState<Record<string, Record<string, number | null>>>({});
  // fileName -> matchId override ("unset" = not yet touched by the user, so the suggested match still applies)
  const [matchIdOverride, setMatchIdOverride] = useState<Record<string, number | null | "unset">>({});
  // fileName -> original drill name -> renamed drill name (Catapult's own drill/period names are often generic, e.g. "11 v 11")
  const [drillNameOverride, setDrillNameOverride] = useState<Record<string, Record<string, string>>>({});

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
      const res = await fetch("/api/physical-stats/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Preview failed.");
      } else {
        const results: PreviewResult[] = body.results;
        setPreviews(results);
        setSessionTypeOverride(
          Object.fromEntries(results.filter((p) => p.ok && p.meta).map((p) => [p.fileName, p.meta!.sessionType]))
        );
        setPlayerIdOverride({});
        setMatchIdOverride({});
        setDrillNameOverride({});
      }
    } catch {
      setError("Network error while uploading.");
    } finally {
      setPreviewing(false);
    }
  }

  function resolvedPlayerId(fileName: string, pl: CatapultPlayerRow): number | null {
    const fileOverrides = playerIdOverride[fileName];
    if (fileOverrides && pl.playerNameRaw in fileOverrides) return fileOverrides[pl.playerNameRaw];
    return pl.match.playerId;
  }

  function resolvedMatchId(p: PreviewResult): number | null {
    const override = matchIdOverride[p.fileName];
    if (override !== undefined && override !== "unset") return override;
    return p.suggestedMatchId ?? null;
  }

  function resolvedDrillName(fileName: string, drill: string | null): string | null {
    if (drill === null) return null;
    return drillNameOverride[fileName]?.[drill] ?? drill;
  }

  async function handleImport() {
    if (!previews) return;
    const okReports = previews
      .filter((p) => p.ok && p.meta && p.players)
      .map((p) => ({
        fileName: p.fileName,
        meta: { ...p.meta!, sessionType: sessionTypeOverride[p.fileName] ?? p.meta!.sessionType },
        players: p.players!.map((pl) => ({ ...pl, playerId: resolvedPlayerId(p.fileName, pl), drill: resolvedDrillName(p.fileName, pl.drill) })),
        matchId: resolvedMatchId(p),
      }));
    if (okReports.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/physical-stats/import", {
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

  function removePlayer(fileName: string, playerNameRaw: string) {
    setPreviews((prev) =>
      prev
        ? prev.map((p) =>
            p.fileName === fileName && p.players ? { ...p, players: p.players.filter((pl) => pl.playerNameRaw !== playerNameRaw) } : p
          )
        : prev
    );
  }

  const okPreviewCount = previews?.filter((p) => p.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handlePreview} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Catapult session PDFs</label>
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
        <div className="flex flex-col gap-4">
          {previews.map((p) => (
            <div key={p.fileName} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md p-3">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">{p.fileName}</div>
              {!p.ok && <p className="text-xs text-red-500 dark:text-red-400">{p.error}</p>}
              {p.ok && p.meta && p.players && (
                <>
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {p.meta.clubName ?? "Unknown club"} · {p.meta.sessionDateIso ?? "unknown date"} · {p.players.length} players
                    </span>
                    <label className="flex items-center gap-1.5">
                      <span>Session type:</span>
                      <select
                        value={sessionTypeOverride[p.fileName] ?? p.meta.sessionType}
                        onChange={(e) => setSessionTypeOverride((prev) => ({ ...prev, [p.fileName]: e.target.value }))}
                        className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded px-1.5 py-0.5 text-gray-900 dark:text-white"
                      >
                        <option value="training">Training</option>
                        <option value="match">Matchday</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span>Link to match:</span>
                      <select
                        value={resolvedMatchId(p) ?? ""}
                        onChange={(e) =>
                          setMatchIdOverride((prev) => ({ ...prev, [p.fileName]: e.target.value === "" ? null : Number(e.target.value) }))
                        }
                        className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded px-1.5 py-0.5 text-gray-900 dark:text-white"
                      >
                        <option value="">— none —</option>
                        {(p.matches ?? []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-col gap-3">
                    {groupByDrill(p.players).map(({ drill, rows }) => (
                      <details key={drill ?? "__summary__"} open={drill === null} className="border border-gray-200 dark:border-[#2a2b30] rounded-md">
                        <summary className="cursor-pointer select-none text-xs font-semibold text-gray-700 dark:text-gray-200 px-2 py-1.5 bg-gray-100 dark:bg-[#15161a] flex items-center gap-2">
                          {drill === null ? (
                            <span>Team Summary (whole session)</span>
                          ) : (
                            <input
                              type="text"
                              value={resolvedDrillName(p.fileName, drill) ?? drill}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setDrillNameOverride((prev) => ({
                                  ...prev,
                                  [p.fileName]: { ...prev[p.fileName], [drill]: e.target.value },
                                }))
                              }
                              title="Rename this drill/period before importing"
                              className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded px-1.5 py-0.5 font-semibold text-gray-900 dark:text-white"
                            />
                          )}
                          <span className="font-normal text-gray-400">· {rows.length} players</span>
                        </summary>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 dark:text-gray-400">
                                <th className="pr-3 py-1 pl-2">Player (Catapult)</th>
                                <th className="pr-3 py-1">Matched to</th>
                                <th className="pr-3 py-1">Dur</th>
                                <th className="pr-3 py-1">Dist (m)</th>
                                <th className="pr-3 py-1">Max Vel</th>
                                <th className="pr-3 py-1">HS Dist (m)</th>
                                <th className="pr-3 py-1">Sprint (m)</th>
                                <th className="pr-3 py-1">PL</th>
                                <th className="pr-3 py-1">As</th>
                                <th className="pr-3 py-1">Ds</th>
                                <th className="pr-3 py-1">Jumps</th>
                                {drill === null && <th className="pr-3 py-1"></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((pl) => {
                                const currentId = resolvedPlayerId(p.fileName, pl);
                                const matchedName = (p.roster ?? []).find((r) => r.id === currentId)?.name ?? null;
                                return (
                                  <tr key={`${drill ?? "__summary__"}-${pl.playerNameRaw}`} className="border-t border-gray-200 dark:border-[#2a2b30]">
                                    <td className="pr-3 py-1 pl-2 text-gray-900 dark:text-white whitespace-nowrap">{pl.playerNameRaw}</td>
                                    <td className="pr-3 py-1">
                                      {drill === null ? (
                                        <select
                                          value={currentId ?? ""}
                                          onChange={(e) =>
                                            setPlayerIdOverride((prev) => ({
                                              ...prev,
                                              [p.fileName]: {
                                                ...prev[p.fileName],
                                                [pl.playerNameRaw]: e.target.value === "" ? null : Number(e.target.value),
                                              },
                                            }))
                                          }
                                          className={`bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded px-1.5 py-0.5 ${confidenceColor(pl.match.confidence)}`}
                                        >
                                          <option value="">— no match —</option>
                                          {(p.roster ?? []).map((r) => (
                                            <option key={r.id} value={r.id}>
                                              {r.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className={confidenceColor(pl.match.confidence)}>{matchedName ?? "— no match —"}</span>
                                      )}
                                    </td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{formatDuration(pl.durationSeconds)}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.totalDistanceM ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.maxVelocityKmh ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.hsDistanceM ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.sprintDistanceM ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.playerLoad ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.accelerations ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.decelerations ?? "—"}</td>
                                    <td className="pr-3 py-1 text-gray-700 dark:text-gray-300">{pl.totalJumps ?? "—"}</td>
                                    {drill === null && (
                                      <td className="py-1">
                                        <button
                                          type="button"
                                          onClick={() => removePlayer(p.fileName, pl.playerNameRaw)}
                                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1"
                                          title="Remove this player (and every drill row for them) from the import"
                                        >
                                          ✕
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ))}
                  </div>
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
                  {r.clubName} — {r.sessionDateIso} — {r.playerCount} players
                  {r.unmatchedCount ? ` (${r.unmatchedCount} without a player match)` : ""}
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
