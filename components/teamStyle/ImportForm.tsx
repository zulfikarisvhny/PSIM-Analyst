// components/teamStyle/ImportForm.tsx
"use client";
import { useState } from "react";

interface TeamStyleMetrics {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  possessionPct: number | null;
  directPct: number | null;
  passAccuracyPct: number | null;
  xgPerShot: number | null;
  proactiveDefPct: number | null;
  stepOutPct: number | null;
  aerialPct: number | null;
}

interface TeamStyleResult {
  teamName: string;
  metrics: TeamStyleMetrics;
}

interface ImportResult {
  teamName: string;
  ok: boolean;
  error?: string;
  matchesPlayed?: number;
}

function fmt(v: number | null, decimals = 2): string {
  return v === null ? "—" : v.toFixed(decimals);
}

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<TeamStyleResult[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setImportResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/team-style/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Preview failed.");
      } else {
        setPreview(body.results);
        setSelected(Object.fromEntries((body.results as TeamStyleResult[]).map((r) => [r.teamName, true])));
      }
    } catch {
      setError("Network error while uploading.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    const teams = preview.filter((t) => selected[t.teamName]);
    if (teams.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/team-style/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
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

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handlePreview} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Team Stats xlsx</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setImportResults(null);
            }}
            className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 dark:file:bg-[#ffcf4d] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white dark:file:text-[#0e0e10]"
          />
          {file && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Selected: {file.name}</p>}
        </div>

        <button
          type="submit"
          disabled={previewing || !file}
          className="self-start text-sm font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-4 py-2 disabled:opacity-50"
        >
          {previewing ? "Computing…" : "Preview extracted data"}
        </button>
      </form>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      {preview && !importResults && (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="pr-3 py-1"></th>
                  <th className="pr-3 py-1">Team</th>
                  <th className="pr-3 py-1">MP</th>
                  <th className="pr-3 py-1">W-D-L</th>
                  <th className="pr-3 py-1">Poss%</th>
                  <th className="pr-3 py-1">Direct%</th>
                  <th className="pr-3 py-1">Pass Acc%</th>
                  <th className="pr-3 py-1">xG/Shot</th>
                  <th className="pr-3 py-1">Proactive Def%</th>
                  <th className="pr-3 py-1">Step Out%</th>
                  <th className="pr-3 py-1">Aerial%</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((t) => (
                  <tr key={t.teamName} className="border-t border-gray-200 dark:border-[#2a2b30]">
                    <td className="pr-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={!!selected[t.teamName]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [t.teamName]: e.target.checked }))}
                      />
                    </td>
                    <td className="pr-3 py-1.5 text-gray-900 dark:text-white whitespace-nowrap font-semibold">{t.teamName}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{t.metrics.matchesPlayed}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {t.metrics.wins}-{t.metrics.draws}-{t.metrics.losses}
                    </td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.possessionPct, 1)}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.directPct, 1)}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.passAccuracyPct, 1)}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.xgPerShot, 3)}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.proactiveDefPct, 1)}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.stepOutPct, 1)}</td>
                    <td className="pr-3 py-1.5 text-gray-700 dark:text-gray-300">{fmt(t.metrics.aerialPct, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCount > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="self-start text-sm font-bold bg-emerald-600 text-white rounded-md px-4 py-2 disabled:opacity-50"
            >
              {importing ? "Importing…" : `Import ${selectedCount} team${selectedCount > 1 ? "s" : ""} to database`}
            </button>
          )}
        </div>
      )}

      {importResults && (
        <div className="flex flex-col gap-1.5">
          {importResults.map((r) => (
            <div
              key={r.teamName}
              className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-xs"
            >
              <span className="text-gray-700 dark:text-gray-200">{r.teamName}</span>
              {r.ok ? (
                <span className="text-emerald-600 dark:text-emerald-400 text-right">{r.matchesPlayed} matches played — saved</span>
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
