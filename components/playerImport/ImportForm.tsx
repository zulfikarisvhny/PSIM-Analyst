// components/playerImport/ImportForm.tsx
"use client";
import { useState } from "react";

interface PreviewPlayer {
  player: string;
  team: string;
  position: string | null;
  age: number | null;
  matchesPlayed: number | null;
  minutesPlayed: number | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
  isNew: boolean;
}

interface PreviewData {
  totalRows: number;
  clubCount: number;
  newCount: number;
  players: PreviewPlayer[];
}

interface ImportSummary {
  clubCount: number;
  newPlayers: number;
  updatedPlayers: number;
  statsRowsWritten: number;
}

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [season, setSeason] = useState("2026/2027");
  const [competition, setCompetition] = useState("Liga 1");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/players/preview", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Preview failed.");
      } else {
        setPreview(body);
      }
    } catch {
      setError("Network error while uploading.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("season", season);
    formData.append("competition", competition);

    try {
      const res = await fetch("/api/players/import", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Import failed.");
      } else {
        setSummary(body);
      }
    } catch {
      setError("Network error while importing.");
    } finally {
      setImporting(false);
    }
  }

  const filteredPlayers = preview?.players.filter((p) => {
    if (onlyNew && !p.isNew) return false;
    if (query && !p.player.toLowerCase().includes(query.toLowerCase()) && !p.team.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handlePreview} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Player search xlsx (whole league)</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setSummary(null);
            }}
            className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 dark:file:bg-[#ffcf4d] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white dark:file:text-[#0e0e10]"
          />
          {file && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Selected: {file.name}</p>}
        </div>

        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Season</label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white w-32"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Competition</label>
            <input
              type="text"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white w-32"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={previewing || !file}
          className="self-start text-sm font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-4 py-2 disabled:opacity-50"
        >
          {previewing ? "Reading…" : "Preview extracted data"}
        </button>
      </form>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      {preview && !summary && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <b>{preview.totalRows}</b> players across <b>{preview.clubCount}</b> clubs — <b className="text-emerald-600 dark:text-emerald-400">{preview.newCount} new</b>,{" "}
            {preview.totalRows - preview.newCount} existing (will be refreshed).
          </p>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player or club..."
              className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white w-64"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
              New players only
            </label>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 dark:border-[#2a2b30] rounded-md">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-[#0e0e10]">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-1.5">Player</th>
                  <th className="px-2 py-1.5">Team</th>
                  <th className="px-2 py-1.5">Pos</th>
                  <th className="px-2 py-1.5">Age</th>
                  <th className="px-2 py-1.5">MP</th>
                  <th className="px-2 py-1.5">Min</th>
                  <th className="px-2 py-1.5">G</th>
                  <th className="px-2 py-1.5">A</th>
                  <th className="px-2 py-1.5">xG</th>
                  <th className="px-2 py-1.5">xA</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers?.map((p) => (
                  <tr key={`${p.team}:${p.player}`} className="border-t border-gray-200 dark:border-[#2a2b30]">
                    <td className="px-2 py-1 text-gray-900 dark:text-white whitespace-nowrap">{p.player}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{p.team}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.position ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.age ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.matchesPlayed ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.minutesPlayed ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.goals ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.assists ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.xg ?? "—"}</td>
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">{p.xa ?? "—"}</td>
                    <td className="px-2 py-1">
                      {p.isNew && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="self-start text-sm font-bold bg-emerald-600 text-white rounded-md px-4 py-2 disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import ${preview.totalRows} players to database`}
          </button>
        </div>
      )}

      {summary && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4 text-sm text-emerald-700 dark:text-emerald-300">
          Done — {summary.clubCount} clubs, {summary.newPlayers} new players, {summary.updatedPlayers} existing players updated,{" "}
          {summary.statsRowsWritten} season-stats rows written.
        </div>
      )}
    </div>
  );
}
