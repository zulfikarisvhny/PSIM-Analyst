// components/scouting/TeamFormationHistory.tsx
"use client";
import { useState } from "react";
import type { FormationSlotEntry, PlayerTag, TeamFormationMatch } from "@/lib/scouting/teamFormationsFromReports";

// Matches how match-report PDFs color-code their own lineup pages: foreign
// players in blue, U23 (home-grown/young) players in orange, everyone else
// in near-black. Same convention for both the pitch labels and the list.
const TAG_COLOR: Record<"foreign" | "u23", string> = {
  foreign: "#2563eb",
  u23: "#e08a1e",
};

function nameColor(tag: PlayerTag): string {
  return tag ? TAG_COLOR[tag] : "#1f2937";
}

function PlayerDot({ slot }: { slot: FormationSlotEntry }) {
  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{ left: `${slot.xPct}%`, top: `${100 - slot.yPct}%`, transform: "translate(-50%, -50%)" }}
    >
      <div className="w-6 h-6 rounded-full bg-[#e0392e] border border-white shadow flex items-center justify-center text-[10px] font-bold text-white">
        {slot.jersey}
      </div>
      <span
        className="text-[7.5px] font-bold text-center leading-tight max-w-[74px] truncate uppercase"
        style={{ color: nameColor(slot.tag) }}
      >
        {slot.playerName}
      </span>
    </div>
  );
}

function PitchLines() {
  return (
    <svg viewBox="0 0 68 105" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {/* outer boundary */}
      <rect x={0.3} y={0.3} width={67.4} height={104.4} fill="none" stroke="#1f2937" strokeWidth={0.6} />
      {/* halfway line + center circle/spot */}
      <line x1={0} y1={52.5} x2={68} y2={52.5} stroke="#1f2937" strokeWidth={0.5} />
      <circle cx={34} cy={52.5} r={9.15} fill="none" stroke="#1f2937" strokeWidth={0.5} />
      <circle cx={34} cy={52.5} r={0.5} fill="#1f2937" />
      {/* top penalty box + D + spot */}
      <rect x={13.84} y={0} width={40.32} height={16.5} fill="none" stroke="#1f2937" strokeWidth={0.5} />
      <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" fill="none" stroke="#1f2937" strokeWidth={0.5} />
      <circle cx={34} cy={11} r={0.375} fill="#1f2937" />
      {/* bottom penalty box + D + spot */}
      <rect x={13.84} y={88.5} width={40.32} height={16.5} fill="none" stroke="#1f2937" strokeWidth={0.5} />
      <path d="M 26.69 88.5 A 9.15 9.15 0 0 1 41.31 88.5" fill="none" stroke="#1f2937" strokeWidth={0.5} />
      <circle cx={34} cy={94} r={0.375} fill="#1f2937" />
      {/* goal ticks */}
      <rect x={29.32} y={-1.3} width={9.36} height={1.3} fill="#1f2937" />
      <rect x={29.32} y={105} width={9.36} height={1.3} fill="#1f2937" />
      {/* corner arcs */}
      <path d="M 1.3 0 A 1.3 1.3 0 0 1 0 1.3" fill="none" stroke="#1f2937" strokeWidth={0.4} />
      <path d="M 68 1.3 A 1.3 1.3 0 0 1 66.7 0" fill="none" stroke="#1f2937" strokeWidth={0.4} />
      <path d="M 66.7 105 A 1.3 1.3 0 0 1 68 103.7" fill="none" stroke="#1f2937" strokeWidth={0.4} />
      <path d="M 0 103.7 A 1.3 1.3 0 0 1 1.3 105" fill="none" stroke="#1f2937" strokeWidth={0.4} />
    </svg>
  );
}

function Pitch({ label, slots }: { label: string; slots: FormationSlotEntry[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center mb-1.5">{label}</p>
      <div className="relative w-full mx-auto rounded-md overflow-hidden bg-white border border-gray-200" style={{ aspectRatio: "68 / 105" }}>
        <PitchLines />
        {slots.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-400 px-4 text-center">No lineup data.</p>
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
            <div className="flex flex-col gap-1">
              {startingSorted.map((s, i) => (
                <div key={s.playerId ?? i} className="flex items-center gap-2 text-xs">
                  <span className="w-6 shrink-0 text-right font-mono font-bold text-gray-400">[{s.jersey}]</span>
                  <span className="truncate font-semibold uppercase" style={{ color: nameColor(s.tag) }}>
                    {s.playerName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2">Substitutes</p>
          {match.bench.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No bench data for this match.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {match.bench.map((s, i) => {
                const subIn = match.substitutions.find((sub) => sub.playerInName === s.playerName);
                return (
                  <div key={s.playerId ?? i} className="flex items-center gap-2 text-xs">
                    <span className="w-6 shrink-0 text-right font-mono font-bold text-gray-400">[{s.jersey}]</span>
                    <span className="truncate font-semibold uppercase" style={{ color: nameColor(s.tag) }}>
                      {s.playerName}
                    </span>
                    {subIn && <span className="shrink-0 text-[10px] font-bold text-green-600">↑{subIn.minute}&apos;</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-[#2a2b30]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: TAG_COLOR.foreign }} /> Foreign
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: TAG_COLOR.u23 }} /> U23
          </span>
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
