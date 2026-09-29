// components/matchReports/FormationLineupPitch.tsx
"use client";
import { useState } from "react";

const PSIM = "PSIM Yogyakarta";

interface FormationLineupEntry {
  playerId: number | null;
  playerName: string;
  jersey: number;
  xPct: number; // 0-100, that team's own attack direction (own goal = 0, opponent goal = 100)
  yPct: number; // 0-100, touchline to touchline
}

interface PositionedSlot extends FormationLineupEntry {
  screenX: number;
  screenY: number;
}

// Two separate portrait pitches, side by side (home left, away right), each
// independently oriented: PSIM is always drawn goalkeeper-at-bottom /
// striker-at-top, the opponent always goalkeeper-at-top / striker-at-bottom
// — a fixed reading direction tied to PSIM's identity rather than home/away,
// so PSIM's shape reads the same way regardless of which side of the pitch
// it's drawn on.
function toScreen(slots: FormationLineupEntry[], isPsim: boolean): PositionedSlot[] {
  // yPct = 0 at the striker/opponent-goal end, 100 at the goalkeeper/own-goal
  // end (same convention as AveragePosition, e.g. a GK sits at ~91%). PSIM
  // wants GK at the bottom (high screenY) — a direct mapping; the opponent
  // wants GK at the top (low screenY) — inverted.
  return slots.map((s) => ({
    ...s,
    screenX: s.xPct,
    screenY: isPsim ? s.yPct : 100 - s.yPct,
  }));
}

function PlayerDot({ slot }: { slot: PositionedSlot }) {
  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{ left: `${slot.screenX}%`, top: `${slot.screenY}%`, transform: "translate(-50%, -50%)" }}
    >
      <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-700 dark:border-[#0e0e10] shadow flex items-center justify-center text-[10px] font-bold text-gray-900">
        {slot.jersey}
      </div>
      <span className="text-[8px] font-medium text-white text-center leading-tight max-w-[64px] truncate drop-shadow">{slot.playerName}</span>
    </div>
  );
}

function TeamPortraitPitch({ team, slots }: { team: string; slots: FormationLineupEntry[] }) {
  const positioned = toScreen(slots, team === PSIM);
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 text-center mb-1.5 truncate">{team}</p>
      <div
        className="relative w-full mx-auto rounded-md overflow-hidden"
        style={{ aspectRatio: "68 / 105", background: "repeating-linear-gradient(180deg, #2f8f4e 0%, #2f8f4e 10%, #34954f 10%, #34954f 20%)" }}
      >
        <div className="absolute inset-2 border border-white/40 rounded-sm" />
        <div className="absolute left-2 right-2 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full border border-white/40" style={{ transform: "translate(-50%, -50%)" }} />
        {positioned.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-white/70 px-4 text-center">No lineup data for this side.</p>
        ) : (
          positioned.map((s, i) => <PlayerDot key={s.playerId ?? `${team}-${i}`} slot={s} />)
        )}
      </div>
    </div>
  );
}

export function FormationLineupPitch({
  homeTeam,
  awayTeam,
  starting,
  final: finalLineup,
}: {
  homeTeam: string;
  awayTeam: string;
  starting: { home: FormationLineupEntry[]; away: FormationLineupEntry[] };
  final: { home: FormationLineupEntry[]; away: FormationLineupEntry[] };
}) {
  const [phase, setPhase] = useState<"starting" | "final">("starting");
  const current = phase === "starting" ? starting : finalLineup;

  if (starting.home.length === 0 && starting.away.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No formation lineup data available for this match.</p>;
  }

  return (
    <div>
      <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold w-fit mb-3">
        <button
          onClick={() => setPhase("starting")}
          className={`px-3 py-1.5 ${
            phase === "starting" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          Starting XI
        </button>
        <button
          onClick={() => setPhase("final")}
          className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
            phase === "final" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          Final XI
        </button>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
        {phase === "starting" ? "Lineup at kickoff." : "Lineup at the final whistle."} PSIM always reads goalkeeper-bottom / striker-top; the opponent reads goalkeeper-top / striker-bottom.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        <TeamPortraitPitch team={homeTeam} slots={current.home} />
        <TeamPortraitPitch team={awayTeam} slots={current.away} />
      </div>
    </div>
  );
}
