// components/matchReports/PitchLineup.tsx
"use client";

interface LineupPlayer {
  playerId: number | null;
  name: string;
  jersey: number | null;
  position: string;
  photoUrl: string | null;
}

interface MatchEventEntry {
  type: "goal" | "yellow_card" | "red_card" | "substitution";
  minute: string;
  player: string;
  subInPlayer: string | null;
}

// Strips a leading L/R (LCB -> CB, RDMF -> DMF) so codes for the same role on
// either flank share a depth band; GK/CB/DMF/CMF/AMF/WF/CF cover everything
// seen in real Wyscout exports, with an unknown code falling back to midfield
// rather than crashing the layout.
function baseCode(code: string): string {
  return code.replace(/^[LR](?=[A-Z])/, "");
}
const DEPTH: Record<string, number> = { GK: 0, B: 1, CB: 1, WB: 1, DMF: 2, CMF: 3, AMF: 4, WF: 4, W: 4, CF: 5 };
function depthOf(code: string): number {
  return DEPTH[baseCode(code)] ?? 3;
}
function laneHint(code: string): number {
  if (/^L/.test(code)) return 0;
  if (/^R/.test(code)) return 2;
  return 1;
}

interface PositionedPlayer extends LineupPlayer {
  xPct: number;
  yPct: number;
}

/** Groups players by depth band (GK/DEF/DMF/MID/AMF/FW), then spreads each band evenly across the pitch height — adapts to any formation shape without a hardcoded per-formation layout. */
function layoutSide(players: LineupPlayer[], side: "home" | "away"): PositionedPlayer[] {
  const groups = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    const d = depthOf(p.position);
    const list = groups.get(d) ?? [];
    list.push(p);
    groups.set(d, list);
  }
  const out: PositionedPlayer[] = [];
  for (const [depth, list] of groups) {
    const sorted = [...list].sort((a, b) => laneHint(a.position) - laneHint(b.position));
    const n = sorted.length;
    sorted.forEach((p, i) => {
      const yPct = ((i + 1) / (n + 1)) * 100;
      const depthPct = depth / 5;
      const xPct = side === "home" ? 6 + depthPct * 40 : 94 - depthPct * 40;
      out.push({ ...p, xPct, yPct });
    });
  }
  return out;
}

const EVENT_BADGE: Record<MatchEventEntry["type"], string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔴",
};

function PlayerDot({ player, events }: { player: PositionedPlayer; events: MatchEventEntry[] }) {
  const own = events.filter((e) => e.player === player.name || e.subInPlayer === player.name);

  return (
    <div className="absolute flex flex-col items-center gap-1" style={{ left: `${player.xPct}%`, top: `${player.yPct}%`, transform: "translate(-50%, -50%)" }}>
      <div className="relative">
        {player.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-[#191a1d] shadow" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-[#2a2b30] border-2 border-white dark:border-[#191a1d] shadow flex items-center justify-center text-[9px] font-bold text-gray-700 dark:text-gray-200">
            {player.jersey ?? "?"}
          </div>
        )}
        {player.photoUrl && (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-800 dark:bg-[#0e0e10] text-white text-[7px] font-bold flex items-center justify-center border border-white dark:border-[#191a1d]">
            {player.jersey ?? "?"}
          </span>
        )}
      </div>
      <span className="text-[8px] font-medium text-white text-center leading-tight max-w-[60px] truncate drop-shadow">{player.name}</span>
      {own.length > 0 && (
        <div className="flex items-center gap-0.5">
          {own.map((e, i) => (
            <span key={i} className="text-[8px] leading-none" title={`${e.type} ${e.minute}'`}>
              {e.type === "substitution" && e.player === player.name ? "🔴" : EVENT_BADGE[e.type]}
              <span className="text-white/80">{e.minute}&apos;</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PitchLineup({
  home,
  away,
  events,
}: {
  home: LineupPlayer[];
  away: LineupPlayer[];
  events: { home: MatchEventEntry[]; away: MatchEventEntry[] } | null;
}) {
  if (home.length === 0 && away.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No starting lineup parsed for this match.</p>;
  }

  const homePositioned = layoutSide(home, "home");
  const awayPositioned = layoutSide(away, "away");

  return (
    <div
      className="relative w-full max-w-xl mx-auto rounded-md overflow-hidden"
      style={{ aspectRatio: "16 / 10", background: "repeating-linear-gradient(90deg, #2f8f4e 0%, #2f8f4e 10%, #34954f 10%, #34954f 20%)" }}
    >
      {/* pitch markings */}
      <div className="absolute inset-2 border border-white/40 rounded-sm" />
      <div className="absolute top-2 bottom-2 left-1/2 w-px bg-white/40" />
      <div className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full border border-white/40" style={{ transform: "translate(-50%, -50%)" }} />

      {homePositioned.map((p, i) => (
        <PlayerDot key={p.playerId ?? `home-${i}`} player={p} events={events?.home ?? []} />
      ))}
      {awayPositioned.map((p, i) => (
        <PlayerDot key={p.playerId ?? `away-${i}`} player={p} events={events?.away ?? []} />
      ))}
    </div>
  );
}
