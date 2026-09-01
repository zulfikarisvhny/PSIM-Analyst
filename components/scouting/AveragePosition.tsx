// components/scouting/AveragePosition.tsx
"use client";
import { useState } from "react";
import { ROSTER_BY_TEAM, FILTER_LABELS, POSITION_LABELS, RosterFilter, RosterPlayer } from "@/lib/scouting/roster";
import { MATCH_LOG_BY_TEAM } from "@/lib/scouting/matchlog";

function matchCountByFilter(teamName: string): Record<RosterFilter, number> {
  const matchLog = MATCH_LOG_BY_TEAM[teamName] ?? [];
  return {
    all: matchLog.length,
    win: matchLog.filter((m) => m.result === "W").length,
    draw: matchLog.filter((m) => m.result === "D").length,
    loss: matchLog.filter((m) => m.result === "L").length,
  };
}

// Regulation pitch proportions (105m x 68m FIFA standard), scaled to px.
const SCALE = 7.24; // px per metre
const BOX_DEPTH = Math.round(16.5 * SCALE); // penalty box depth ≈119
const BOX_SPAN = Math.round(40.3 * SCALE); // penalty box width ≈292
const SIX_DEPTH = Math.round(5.5 * SCALE); // six-yard box depth ≈40
const SIX_SPAN = Math.round(18.32 * SCALE); // six-yard box width ≈133
const CIRCLE_R = Math.round(9.15 * SCALE); // center circle radius ≈66

// Overall map (GK at top, attack at bottom) — stretched wider than true
// FIFA proportions to match the MidBlock reference screenshots' layout,
// which give the pitch more left-right breathing room than a literal
// 68x105 scale does. Padding kept tight so wide players (e.g. fullbacks
// near the touchline) land close to the true edge instead of being pulled
// inward — MidBlock's own reference plots them right up against it.
const MAIN_PITCH_W = 580;
const MAIN_PITCH_H = Math.round(105 * SCALE); // ≈760
const MAIN_PITCH_PAD_X = 18;
const MAIN_PITCH_PAD_Y = 55;

const STROKE = "#ffffff80";

function radiusFor(minutes: number, minM: number, maxM: number) {
  if (maxM === minM) return 18;
  const t = (minutes - minM) / (maxM - minM);
  return 14 + t * 8; // 14–22px
}

function PitchMarkings({ w, h }: { w: number; h: number }) {
  return (
    <>
      <rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke={STROKE} strokeWidth={2} />
      <line x1={4} y1={h / 2} x2={w - 4} y2={h / 2} stroke={STROKE} strokeWidth={2} />
      <circle cx={w / 2} cy={h / 2} r={CIRCLE_R} fill="none" stroke={STROKE} strokeWidth={2} />
      <circle cx={w / 2} cy={h / 2} r={2.5} fill={STROKE} />
    </>
  );
}

function PortraitBoxes({ w, h }: { w: number; h: number }) {
  return (
    <>
      <rect x={(w - BOX_SPAN) / 2} y={4} width={BOX_SPAN} height={BOX_DEPTH} fill="none" stroke={STROKE} strokeWidth={2} />
      <rect x={(w - SIX_SPAN) / 2} y={4} width={SIX_SPAN} height={SIX_DEPTH} fill="none" stroke={STROKE} strokeWidth={2} />
      <rect x={(w - BOX_SPAN) / 2} y={h - 4 - BOX_DEPTH} width={BOX_SPAN} height={BOX_DEPTH} fill="none" stroke={STROKE} strokeWidth={2} />
      <rect x={(w - SIX_SPAN) / 2} y={h - 4 - SIX_DEPTH} width={SIX_SPAN} height={SIX_DEPTH} fill="none" stroke={STROKE} strokeWidth={2} />
    </>
  );
}

// Downward attack-direction cue for the portrait overall map (GK top,
// attack bottom) — a low-opacity shaft + arrowhead from just past the
// center circle toward the attacking box, kept faint so it doesn't compete
// with the player bubbles on top of it.
function AttackDirectionArrow({ w, h }: { w: number; h: number }) {
  const cx = w / 2;
  const shaftTop = h / 2 + CIRCLE_R - 6;
  const shaftBottom = h / 2 + CIRCLE_R + 130;
  const headHeight = 34;
  const headWidth = 22;
  return (
    <g opacity={0.14} fill="#ffffff">
      <rect x={cx - 9} y={shaftTop} width={18} height={shaftBottom - shaftTop - headHeight} />
      <polygon
        points={`${cx - headWidth},${shaftBottom - headHeight} ${cx + headWidth},${shaftBottom - headHeight} ${cx},${shaftBottom}`}
      />
    </g>
  );
}

export function AveragePosition({ teamName, logoUrl }: { teamName: string; logoUrl?: string | null }) {
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [hovered, setHovered] = useState<number | null>(null);
  const teamRoster = ROSTER_BY_TEAM[teamName] ?? { all: [], win: [], draw: [], loss: [] };
  const roster = teamRoster[filter];
  const matchCount = matchCountByFilter(teamName);

  const minM = roster.length ? Math.min(...roster.map((p) => p.minutes)) : 0;
  const maxM = roster.length ? Math.max(...roster.map((p) => p.minutes)) : 0;

  // Portrait: GK at top (frac.y=1) → small pixel-y; attack at bottom (frac.y=0) → large pixel-y.
  // x is mirrored: player.x is the fraction from the team's own left touchline
  // (their left when facing the direction of attack), but this pitch is drawn
  // attacking downward, which flips that onto the opposite screen side.
  const pitchPositions: { x: number; y: number; player: RosterPlayer }[] = roster.map((player) => ({
    x: MAIN_PITCH_PAD_X + (1 - player.x) * (MAIN_PITCH_W - 2 * MAIN_PITCH_PAD_X),
    y: MAIN_PITCH_PAD_Y + (1 - player.y) * (MAIN_PITCH_H - 2 * MAIN_PITCH_PAD_Y),
    player,
  }));

  const hoveredPos = pitchPositions.find((p) => p.player.number === hovered);

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Most-Used Starting Lineup</h3>
      <p className="text-xs text-gray-500 mb-2">
        Showing the top 11 starters from {matchCount[filter]} matches ({FILTER_LABELS[filter]}).
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Data from Opta Stats and MidBlock. Each player&apos;s position is calculated from the average location of their
        <b className="text-gray-700 dark:text-gray-300"> on-ball actions</b> (ball touches — passing, dribbling, shooting, etc.) over the
        course of the match, not just a static formation slot. Bubble size = minutes played.
      </p>
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as RosterFilter)}
          className="bg-gray-100 dark:bg-[#26272c] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md p-1.5 text-xs"
        >
          {(Object.keys(FILTER_LABELS) as RosterFilter[]).map((f) => (
            <option key={f} value={f}>
              {FILTER_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {roster.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">
          No data available for the &quot;{FILTER_LABELS[filter]}&quot; filter yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-5 mb-5">
          <div className="relative w-full max-w-[460px] mx-auto lg:mx-0">
            <svg viewBox={`0 0 ${MAIN_PITCH_W} ${MAIN_PITCH_H}`} className="w-full rounded-lg" style={{ background: "#1e4a30" }}>
              <PitchMarkings w={MAIN_PITCH_W} h={MAIN_PITCH_H} />
              <PortraitBoxes w={MAIN_PITCH_W} h={MAIN_PITCH_H} />
              <AttackDirectionArrow w={MAIN_PITCH_W} h={MAIN_PITCH_H} />

              {pitchPositions.map(({ x, y, player }) => {
                const r = radiusFor(player.minutes, minM, maxM);
                return (
                  <g
                    key={player.number}
                    onMouseEnter={() => setHovered(player.number)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={x} cy={y} r={r} fill="#ffcf4d" stroke="#0e0e10" strokeWidth={2} />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize={13} fontWeight={800} fill="#0e0e10">
                      {player.number}
                    </text>
                    <text x={x} y={y - r - 8} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>
                      {player.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full pl-1.5 pr-3.5 py-1.5">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#2a2b30] flex items-center justify-center text-[9px] font-bold text-gray-300">
                  {teamName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-bold text-white">{teamName}</span>
            </div>

            {hoveredPos && (
              <div
                className="absolute z-20 bg-[#0e0e10] border border-[#2a2b30] rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none whitespace-nowrap"
                style={{
                  left: `${(hoveredPos.x / MAIN_PITCH_W) * 100}%`,
                  top: `${(hoveredPos.y / MAIN_PITCH_H) * 100}%`,
                  transform: "translate(-50%, -125%)",
                }}
              >
                <div className="font-bold text-white mb-1">
                  {hoveredPos.player.number} · {hoveredPos.player.shortName}
                </div>
                <div className="text-gray-300">
                  {(hoveredPos.player.touches / hoveredPos.player.apps).toFixed(1)} touches/match
                </div>
              </div>
            )}
          </div>

          <div className="lg:-mt-9 lg:max-w-xl">
            <div className="text-[14.4px] font-bold text-gray-900 dark:text-white mb-[10.7px]">Players</div>
            <div className="flex flex-col gap-[10.7px]">
              {roster
                .slice()
                .sort((a, b) => b.minutes - a.minutes)
                .map((p) => (
                  <div
                    key={p.number}
                    className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-[14.4px] py-[10.7px] text-[14.4px]"
                  >
                    <span className="text-gray-700 dark:text-gray-200 truncate">
                      <b className="text-gray-900 dark:text-white">{p.number}</b> {p.shortName}
                      <span className="text-gray-500"> · {POSITION_LABELS[p.position]}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
                      {p.apps}A · {p.minutes}&apos; · {p.touches}t
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
