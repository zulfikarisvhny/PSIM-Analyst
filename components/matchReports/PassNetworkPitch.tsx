// components/matchReports/PassNetworkPitch.tsx
"use client";
import { useState } from "react";

const PSIM = "PSIM Yogyakarta";

interface PassNetworkPlayer {
  playerId: number;
  name: string;
  totalPasses: number;
  defThirdPct?: number | null;
  midThirdPct?: number | null;
  finalThirdPct?: number | null;
  xPct: number | null;
  yPct: number | null;
  jersey: number | null;
}

interface PassNetworkEdge {
  fromPlayerId: number;
  toPlayerId: number;
  passCount: number;
}

interface TeamPassNetwork {
  players: PassNetworkPlayer[];
  edges: PassNetworkEdge[];
}

// Wyscout's own 0-100 position grid isn't linear — it's anchored to pitch
// landmarks (goal line, 6-yard box, penalty box, halfway line) which sit at
// uneven real-world distances. These breakpoints (Wyscout % -> meters on a
// standard 105x68 pitch) let us undo that distortion via piecewise-linear
// interpolation instead of a flat stretch, so e.g. a position right at the
// penalty-box-edge landmark lands at the real 16.5m, not a guessed value.
const WX = [0, 6, 10, 16, 50, 84, 90, 94, 100];
const MX = [0, 5.5, 11, 16.5, 52.5, 88.5, 94, 99.5, 105];
const WY = [0, 19, 37, 44, 56, 63, 81, 100];
const MY = [0, 13.84, 24.84, 30.34, 37.66, 43.16, 54.16, 68];

function interp(v: number, xs: number[], ys: number[]): number {
  if (v <= xs[0]) return ys[0];
  const last = xs.length - 1;
  if (v >= xs[last]) return ys[last];
  for (let i = 0; i < last; i++) {
    if (v >= xs[i] && v <= xs[i + 1]) {
      const t = (v - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[last];
}

// parseAveragePositions() gives xPct = width-axis %, yPct = length-axis %
// (100 = own goal). Wyscout's own convention attacks left-to-right (x=0 own
// goal, x=100 opponent goal), so wyscoutX = 100 - yPct; wyscoutY = xPct maps
// straight across since both the source diagram and this SVG are y-down.
function toMeters(p: { xPct: number; yPct: number }): { mx: number; my: number } {
  const wyscoutX = 100 - p.yPct;
  const wyscoutY = p.xPct;
  return { mx: interp(wyscoutX, WX, MX), my: interp(wyscoutY, WY, MY) };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Pitch markings drawn in real meters on a standard 105 x 68 pitch — the
// viewBox below matches 1:1, so these are exact FIFA dimensions, not
// approximations: 16.5m penalty box, 5.5m six-yard box, 9.15m circle radius,
// 11m penalty spot.
const PITCH_LINE = { stroke: "white", strokeOpacity: 0.45, strokeWidth: 0.35, fill: "none" } as const;

function PitchMarkings() {
  return (
    <g>
      <rect x={0.3} y={0.3} width={104.4} height={67.4} {...PITCH_LINE} />
      <line x1={52.5} y1={0.3} x2={52.5} y2={67.7} {...PITCH_LINE} />
      <circle cx={52.5} cy={34} r={9.15} {...PITCH_LINE} />
      <circle cx={52.5} cy={34} r={0.35} fill="white" fillOpacity={0.45} />
      {/* Left penalty area + 6-yard box */}
      <rect x={0.3} y={13.84} width={16.2} height={40.32} {...PITCH_LINE} />
      <rect x={0.3} y={24.84} width={5.2} height={18.32} {...PITCH_LINE} />
      <circle cx={11} cy={34} r={0.35} fill="white" fillOpacity={0.45} />
      {/* Right penalty area + 6-yard box */}
      <rect x={88.5} y={13.84} width={16.2} height={40.32} {...PITCH_LINE} />
      <rect x={99.5} y={24.84} width={5.2} height={18.32} {...PITCH_LINE} />
      <circle cx={94} cy={34} r={0.35} fill="white" fillOpacity={0.45} />
    </g>
  );
}

interface PairEdge {
  aId: number;
  bId: number;
  forward?: number; // aId -> bId pass count
  backward?: number; // bId -> aId pass count
}

/** Merges each A->B / B->A pair of edges into one, so a two-way combination draws as a single line instead of two overlapping ones. */
function buildPairs(edges: PassNetworkEdge[]): PairEdge[] {
  const map = new Map<string, PairEdge>();
  for (const e of edges) {
    const aId = Math.min(e.fromPlayerId, e.toPlayerId);
    const bId = Math.max(e.fromPlayerId, e.toPlayerId);
    const key = `${aId}-${bId}`;
    const pair = map.get(key) ?? { aId, bId };
    if (e.fromPlayerId === aId) pair.forward = e.passCount;
    else pair.backward = e.passCount;
    map.set(key, pair);
  }
  return [...map.values()];
}

/** A small filled triangle centered at (cx, cy), pointing along `angle` (radians) — used instead of an end marker so direction reads at the line's midpoint, not buried under the destination node. */
function ArrowHead({ cx, cy, angle, size }: { cx: number; cy: number; angle: number; size: number }) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = cx + cos * size * 0.65;
  const tipY = cy + sin * size * 0.65;
  const baseX = cx - cos * size * 0.4;
  const baseY = cy - sin * size * 0.4;
  const perpX = -sin * size * 0.42;
  const perpY = cos * size * 0.42;
  return <polygon points={`${tipX},${tipY} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`} fill="#1f2937" fillOpacity="0.65" />;
}

function TeamNetwork({ network, teamName }: { network: TeamPassNetwork; teamName: string }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const positioned = network.players.filter((p): p is PassNetworkPlayer & { xPct: number; yPct: number } => p.xPct !== null && p.yPct !== null);

  if (positioned.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">No average-position data available to draw {teamName}&apos;s network.</p>;
  }

  const posById = new Map(positioned.map((p) => [p.playerId, p]));
  const connectableEdges = network.edges.filter((e) => posById.has(e.fromPlayerId) && posById.has(e.toPlayerId) && e.passCount > 3);
  const edges = selectedId === null ? connectableEdges : connectableEdges.filter((e) => e.fromPlayerId === selectedId || e.toPlayerId === selectedId);
  const connectedIds = new Set<number>();
  if (selectedId !== null) {
    connectedIds.add(selectedId);
    for (const e of edges) {
      connectedIds.add(e.fromPlayerId);
      connectedIds.add(e.toPlayerId);
    }
  }
  const maxPassCount = Math.max(...edges.map((e) => e.passCount), 1);
  const maxTouches = Math.max(...positioned.map((p) => p.totalPasses), 1);
  const pairs = buildPairs(edges);
  const maxPairTotal = Math.max(...pairs.map((p) => (p.forward ?? 0) + (p.backward ?? 0)), 1);

  function radiusFor(totalPasses: number): number {
    return 1.8 + (totalPasses / maxTouches) * 1.4;
  }

  function screenPos(p: { xPct: number; yPct: number; totalPasses: number }): { cx: number; cy: number } {
    const { mx, my } = toMeters(p);
    const r = radiusFor(p.totalPasses);
    return { cx: clamp(mx, r, 105 - r), cy: clamp(my, r, 68 - r) };
  }

  const thirds = network.players[0];
  const defPct = thirds?.defThirdPct ?? null;
  const midPct = thirds?.midThirdPct ?? null;
  const finalPct = thirds?.finalThirdPct ?? null;

  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
        Each player plotted at their average on-pitch position (from every action they touched the ball in). Circle size = share of team passes.
      </p>
      <div className="relative w-full max-w-2xl mx-auto rounded-md overflow-hidden" style={{ aspectRatio: "105 / 68", background: "#5aa06a" }}>
        <div className="absolute top-2 bottom-2 left-1/3 w-px border-l border-dashed border-white/30" />
        <div className="absolute top-2 bottom-2 left-2/3 w-px border-l border-dashed border-white/30" />

        {defPct !== null && (
          <span className="absolute top-1.5 text-white/80 text-xs font-bold drop-shadow" style={{ left: "16.6%", transform: "translateX(-50%)" }}>
            {defPct}%
          </span>
        )}
        {midPct !== null && (
          <span className="absolute top-1.5 text-white/80 text-xs font-bold drop-shadow" style={{ left: "50%", transform: "translateX(-50%)" }}>
            {midPct}%
          </span>
        )}
        {finalPct !== null && (
          <span className="absolute top-1.5 text-white/80 text-xs font-bold drop-shadow" style={{ left: "83.3%", transform: "translateX(-50%)" }}>
            {finalPct}%
          </span>
        )}

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 105 68" preserveAspectRatio="none">
          <PitchMarkings />
          {pairs.map((p, i) => {
            const A = posById.get(p.aId)!;
            const B = posById.get(p.bId)!;
            const a = screenPos(A);
            const b = screenPos(B);
            const total = (p.forward ?? 0) + (p.backward ?? 0);
            const lineWidth = 0.12 + (total / maxPairTotal) * 0.9;
            const mx = (a.cx + b.cx) / 2;
            const my = (a.cy + b.cy) / 2;
            const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx); // direction A -> B
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const bothWays = p.forward !== undefined && p.backward !== undefined;
            const gap = bothWays ? 1.8 : 0; // half-gap so opposing arrowheads don't touch
            return (
              <g key={i}>
                <line x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="#1f2937" strokeOpacity={0.5} strokeWidth={lineWidth} />
                {p.forward !== undefined && (
                  <ArrowHead cx={mx + dx * gap} cy={my + dy * gap} angle={angle} size={1.2 + (p.forward / maxPassCount) * 1.6} />
                )}
                {p.backward !== undefined && (
                  <ArrowHead cx={mx - dx * gap} cy={my - dy * gap} angle={angle + Math.PI} size={1.2 + (p.backward / maxPassCount) * 1.6} />
                )}
              </g>
            );
          })}
          {positioned.map((p) => {
            const r = radiusFor(p.totalPasses);
            const { cx, cy } = screenPos(p);
            const dimmed = selectedId !== null && !connectedIds.has(p.playerId);
            return (
              <g
                key={p.playerId}
                onClick={() => setSelectedId(selectedId === p.playerId ? null : p.playerId)}
                opacity={dimmed ? 0.3 : 1}
                style={{ cursor: "pointer" }}
              >
                <circle cx={cx} cy={cy} r={r} fill={selectedId === p.playerId ? "#ffcf4d" : "white"} stroke="#374151" strokeWidth="0.3" />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={r} fontWeight="700" fill="#111827">
                  {p.jersey ?? "?"}
                </text>
                <title>{p.name}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
        {selectedId === null
          ? "Shows only combinations with more than 3 passes in one direction. Click a player to isolate their passes."
          : `Showing combinations of more than 3 passes to/from #${posById.get(selectedId)?.jersey ?? "?"} ${posById.get(selectedId)?.name ?? ""}. Click them again to clear.`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 max-w-2xl mx-auto text-[11px] text-gray-600 dark:text-gray-300">
        {[...positioned].sort((a, b) => (a.jersey ?? 0) - (b.jersey ?? 0)).map((p) => (
          <div key={p.playerId} className="flex items-center gap-1.5 truncate">
            <span className="shrink-0 w-4 text-right font-bold text-gray-400 dark:text-gray-500">{p.jersey ?? "?"}</span>
            <span className="truncate">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PassNetworkPitch({
  homeTeam,
  awayTeam,
  homeNetwork,
  awayNetwork,
}: {
  homeTeam: string;
  awayTeam: string;
  homeNetwork: TeamPassNetwork;
  awayNetwork: TeamPassNetwork;
}) {
  const [side, setSide] = useState<"home" | "away">(awayTeam === PSIM ? "away" : "home");
  return (
    <div>
      <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-[11px] font-semibold w-fit mb-3">
        <button
          onClick={() => setSide("home")}
          className={`px-3 py-1.5 ${
            side === "home" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          {homeTeam}
        </button>
        <button
          onClick={() => setSide("away")}
          className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
            side === "away" ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]" : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200"
          }`}
        >
          {awayTeam}
        </button>
      </div>
      {side === "home" ? (
        <TeamNetwork key="home" network={homeNetwork} teamName={homeTeam} />
      ) : (
        <TeamNetwork key="away" network={awayNetwork} teamName={awayTeam} />
      )}
    </div>
  );
}
