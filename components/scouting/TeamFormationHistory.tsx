// components/scouting/TeamFormationHistory.tsx
"use client";
import { useState } from "react";
import type { FormationSlotEntry, TeamFormationMatch } from "@/lib/scouting/teamFormationsFromReports";

function PlayerDot({ slot }: { slot: FormationSlotEntry }) {
  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{ left: `${slot.xPct}%`, top: `${100 - slot.yPct}%`, transform: "translate(-50%, -50%)" }}
    >
      <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-700 dark:border-[#0e0e10] shadow flex items-center justify-center text-[10px] font-bold text-gray-900">
        {slot.jersey}
      </div>
      <span className="text-[8px] font-medium text-white text-center leading-tight max-w-[70px] truncate drop-shadow">{slot.playerName}</span>
    </div>
  );
}

function Pitch({ label, slots }: { label: string; slots: FormationSlotEntry[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center mb-1.5">{label}</p>
      <div
        className="relative w-full mx-auto rounded-md overflow-hidden"
        style={{ aspectRatio: "68 / 105", background: "repeating-linear-gradient(180deg, #2f8f4e 0%, #2f8f4e 10%, #34954f 10%, #34954f 20%)" }}
      >
        <div className="absolute inset-2 border border-white/40 rounded-sm" />
        <div className="absolute left-2 right-2 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full border border-white/40" style={{ transform: "translate(-50%, -50%)" }} />
        {slots.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-white/70 px-4 text-center">No lineup data.</p>
        ) : (
          slots.map((s, i) => <PlayerDot key={s.playerId ?? `${label}-${i}`} slot={s} />)
        )}
      </div>
    </div>
  );
}

function MatchPanel({ match }: { match: TeamFormationMatch }) {
  // Starting XI, roughly back-to-front (GK first) — matches how the pitch reads bottom (own goal) to top.
  const startingSorted = [...match.starting].sort((a, b) => a.yPct - b.yPct);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_1fr] gap-5 items-start">
      <Pitch label="Starting XI" slots={match.starting} />

      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">Starting lineup</p>
          {startingSorted.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No lineup data.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {startingSorted.map((s, i) => (
                <div key={s.playerId ?? i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 shrink-0 text-right font-mono font-bold text-gray-400">{s.jersey}</span>
                  <span className="truncate text-gray-900 dark:text-white">{s.playerName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">Substitutes used</p>
          {match.substitutions.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No substitutions recorded for this match.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {match.substitutions.map((sub, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 text-right font-mono font-bold text-blue-600 dark:text-[#ffcf4d]">{sub.minute}&apos;</span>
                  <span className="text-gray-400 truncate">{sub.playerOutName ?? "?"}</span>
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <span className="text-gray-900 dark:text-white font-semibold truncate">{sub.playerInName ?? "?"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Pitch label="Final XI" slots={match.final} />
    </div>
  );
}

export function TeamFormationHistory({ teamName, matches }: { teamName: string; matches: TeamFormationMatch[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(matches[0]?.matchId ?? null);
  const selected = matches.find((m) => m.matchId === selectedId) ?? matches[0];

  if (!selected) return null;

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Formations by matchday</h3>
        <p className="text-xs text-gray-400">{matches.length} match{matches.length === 1 ? "" : "es"} from imported reports</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {matches.map((m) => (
          <button
            key={m.matchId}
            type="button"
            onClick={() => setSelectedId(m.matchId)}
            className={`text-xs font-semibold rounded-full border px-3 py-1.5 ${
              selected.matchId === m.matchId
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-[#ffcf4d] dark:bg-[#2a2210] dark:text-[#ffcf4d]"
                : "border-gray-200 dark:border-[#2a2b30] text-gray-600 dark:text-gray-400 hover:border-gray-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
        {teamName}&apos;s own shape — left as it kicked off, right as it ended (after every sub and reshuffle).
      </p>
      <MatchPanel match={selected} />
    </div>
  );
}
