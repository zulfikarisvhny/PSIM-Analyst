// components/scouting/FormationPitch.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { MATCH_LOG_BY_TEAM, OWN_SHORT_BY_TEAM, opponentOf } from "@/lib/scouting/matchlog";
import { NexusPlayerRow } from "@/lib/scouting/players";
import { fetchLineups, saveLineupSlot } from "@/lib/scouting/formationLineups";
import { fetchSlotPositions, saveSlotPositions } from "@/lib/scouting/formationSlotPositions";

type LineRole = "def" | "dm" | "mid" | "am" | "att";

const LABELS: Record<LineRole, (count: number) => string[]> = {
  def: (n) =>
    n === 3 ? ["CB", "CB", "CB"] : n === 4 ? ["LB", "CB", "CB", "RB"] : n === 5 ? ["LWB", "CB", "CB", "CB", "RWB"] : Array(n).fill("CB"),
  dm: (n) => (n <= 1 ? ["CDM"] : Array(n).fill("CDM")),
  mid: (n) =>
    n === 2 ? ["CM", "CM"] : n === 3 ? ["CM", "CM", "CM"] : n === 4 ? ["LM", "CM", "CM", "RM"] : n === 5 ? ["LM", "CM", "CM", "CM", "RM"] : Array(n).fill("CM"),
  am: (n) => (n === 1 ? ["CAM"] : n === 2 ? ["CAM", "CAM"] : n === 3 ? ["LW", "CAM", "RW"] : Array(n).fill("CAM")),
  att: (n) => (n === 1 ? ["ST"] : n === 2 ? ["ST", "ST"] : n === 3 ? ["LW", "ST", "RW"] : Array(n).fill("FW")),
};

function getLineLayout(formation: string): { role: LineRole; count: number }[] {
  const parts = formation.split("-").map(Number);
  const midLines = parts.length - 2;
  return parts.map((count, i) => {
    let role: LineRole;
    if (i === 0) role = "def";
    else if (i === parts.length - 1) role = "att";
    else {
      const midIndex = i - 1;
      role = midLines === 1 ? "mid" : midIndex === 0 ? "dm" : "am";
    }
    return { role, count };
  });
}

interface Slot {
  key: string; // stable within a given formation string
  x: number;
  y: number;
  label: string; // role abbreviation, e.g. "CB"
  displayLabel: string; // role + ordinal when a formation repeats a role, e.g. "CB #1"
}

function getSlots(formation: string): Slot[] {
  const lines = getLineLayout(formation);
  const numLines = lines.length + 1; // +1 for goalkeeper
  const yFor = (lineIdx: number) => PAD_Y + (lineIdx / (numLines - 1)) * (MAX_LINE_Y - PAD_Y);

  const seenCount: Record<string, number> = {};
  const labelCount: Record<string, number> = {};
  for (const line of lines) {
    for (const label of LABELS[line.role](line.count)) {
      labelCount[label] = (labelCount[label] ?? 0) + 1;
    }
  }
  const nextOrdinal = (label: string) => {
    seenCount[label] = (seenCount[label] ?? 0) + 1;
    return labelCount[label] > 1 ? ` #${seenCount[label]}` : "";
  };

  const slots: Slot[] = [{ key: "gk", x: PITCH_W / 2, y: yFor(0), label: "GK", displayLabel: "GK" + nextOrdinal("GK") }];
  lines.forEach((line, i) => {
    const labels = LABELS[line.role](line.count);
    const y = yFor(i + 1);
    labels.forEach((label, j) => {
      // Mirror screen-x: labels (LB, LW, ...) are ordered left-to-right as
      // named from the team's own attacking direction, but this pitch is
      // drawn attacking downward — facing that way flips real left/right
      // onto the opposite screen side (LB sits on-screen-right, RB on-screen-left).
      const mirroredJ = line.count - 1 - j;
      const x = PAD_X + ((mirroredJ + 0.5) / line.count) * (PITCH_W - 2 * PAD_X);
      slots.push({ key: `${line.role}-${i}-${j}`, x, y, label, displayLabel: label + nextOrdinal(label) });
    });
  });
  return slots;
}

// Player id assigned to each depth layer (1st/2nd/3rd choice) of a slot.
// "" = unassigned. Keyed by slot.key, scoped per team+formation.
type SlotDepth = [string, string, string];
type Lineup = Record<string, SlotDepth>;

/** Reshape the flat rows from Supabase into { [formation]: { [slotKey]: [id,id,id] } }. */
function groupLineupRows(rows: { formation: string; slot_key: string; depth: 1 | 2 | 3; player_id: string }[]): Record<string, Lineup> {
  const result: Record<string, Lineup> = {};
  for (const row of rows) {
    const formationLineup = result[row.formation] ?? (result[row.formation] = {});
    const slot = formationLineup[row.slot_key] ?? (formationLineup[row.slot_key] = ["", "", ""]);
    slot[row.depth - 1] = row.player_id;
  }
  return result;
}

type PositionMap = Record<string, { x: number; y: number }>; // slotKey -> custom (x, y)

/** Reshape the flat rows from Supabase into { [formation]: { [slotKey]: {x,y} } }. */
function groupPositionRows(rows: { formation: string; slot_key: string; x: number; y: number }[]): Record<string, PositionMap> {
  const result: Record<string, PositionMap> = {};
  for (const row of rows) {
    const formationPositions = result[row.formation] ?? (result[row.formation] = {});
    formationPositions[row.slot_key] = { x: row.x, y: row.y };
  }
  return result;
}

// Portrait: GK at top, attack line at bottom (matches Average Position tab).
const PITCH_W = 460;
const PITCH_H = 660;
const PAD_X = 50;
const PAD_Y = 78; // GK's line — kept clear of the team-name badge overlaid top-left
const MAX_LINE_Y = 520; // frontmost line stops well before the opponent's box (box starts at PITCH_H - 89 = 571)
const BOX_W = 220;
const BOX_H = 85;

function FormationPitchSVG({
  formation,
  teamName,
  logoUrl,
  slots,
  lineup,
  players,
  onDepthChange,
  isEditing,
  onSlotDrag,
}: {
  formation: string;
  teamName: string;
  logoUrl?: string | null;
  slots: Slot[];
  lineup: Lineup;
  players: NexusPlayerRow[];
  onDepthChange: (slotKey: string, depth: 0 | 1 | 2, playerId: string) => void;
  isEditing: boolean;
  onSlotDrag: (slotKey: string, x: number, y: number) => void;
}) {
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const activeSlot = !isEditing ? slots.find((s) => s.key === activeSlotKey) : undefined;
  const sortedPlayers = players.slice().sort((a, b) => a.player_name.localeCompare(b.player_name));
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingKey = useRef<string | null>(null);

  const playerName = (slotKey: string) => {
    const id = lineup[slotKey]?.[0];
    if (!id) return undefined;
    return players.find((p) => String(p.player_master_id) === id)?.player_name;
  };

  function toViewBoxPoint(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * PITCH_W;
    const y = ((clientY - rect.top) / rect.height) * PITCH_H;
    return {
      x: Math.min(PITCH_W - 24, Math.max(24, x)),
      y: Math.min(PITCH_H - 24, Math.max(24, y)),
    };
  }

  function handlePointerDown(e: React.PointerEvent<SVGGElement>, slotKey: string) {
    if (!isEditing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingKey.current = slotKey;
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>) {
    if (!isEditing || draggingKey.current === null) return;
    const { x, y } = toViewBoxPoint(e.clientX, e.clientY);
    onSlotDrag(draggingKey.current, x, y);
  }

  function handlePointerUp() {
    draggingKey.current = null;
  }

  return (
    <div className="relative w-full max-w-[420px] mx-auto md:mx-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        className="w-full rounded-lg touch-none"
        style={{ background: "#1e4a30" }}
      >
        <rect x={4} y={4} width={PITCH_W - 8} height={PITCH_H - 8} fill="none" stroke="#ffffff40" strokeWidth={2} />
        <line x1={4} y1={PITCH_H / 2} x2={PITCH_W - 4} y2={PITCH_H / 2} stroke="#ffffff40" strokeWidth={2} />
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={58} fill="none" stroke="#ffffff40" strokeWidth={2} />
        <rect x={(PITCH_W - BOX_W) / 2} y={4} width={BOX_W} height={BOX_H} fill="none" stroke="#ffffff40" strokeWidth={2} />
        <rect x={(PITCH_W - BOX_W) / 2} y={PITCH_H - 4 - BOX_H} width={BOX_W} height={BOX_H} fill="none" stroke="#ffffff40" strokeWidth={2} />

        {slots.map((p) => {
          const name = playerName(p.key);
          const isActive = p.key === activeSlotKey;
          return (
            <g
              key={p.key}
              onClick={() => !isEditing && setActiveSlotKey(isActive ? null : p.key)}
              onPointerDown={(e) => handlePointerDown(e, p.key)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{ cursor: isEditing ? "grab" : "pointer" }}
            >
              <text x={p.x} y={p.y - 24} textAnchor="middle" fontSize={9} fill="#ffffffa0" fontWeight={700}>
                {p.label}
              </text>
              <circle
                cx={p.x}
                cy={p.y}
                r={17}
                fill="#ffcf4d"
                stroke={isEditing ? "#4f8fe0" : isActive ? "#4f8fe0" : "#0e0e10"}
                strokeWidth={isEditing || isActive ? 3 : 2}
                strokeDasharray={isEditing ? "3 2" : undefined}
              />
              <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize={12} fill="#fff" fontWeight={700}>
                {name ?? p.label}
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
        <span className="text-xs text-gray-300">· {formation}</span>
      </div>

      {activeSlot && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setActiveSlotKey(null)} />
          <div
            className="absolute z-40 bg-white dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-3 shadow-xl w-56"
            style={{
              left: `${(activeSlot.x / PITCH_W) * 100}%`,
              top: `${(activeSlot.y / PITCH_H) * 100}%`,
              transform:
                activeSlot.y / PITCH_H > 0.6 ? "translate(-50%, -110%)" : "translate(-50%, 30px)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600 dark:text-[#ffcf4d]">{activeSlot.displayLabel}</span>
              <button
                onClick={() => setActiveSlotKey(null)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {DEPTH_LABELS.map((label, i) => (
                <select
                  key={label}
                  value={lineup[activeSlot.key]?.[i] ?? ""}
                  onChange={(e) => onDepthChange(activeSlot.key, i as 0 | 1 | 2, e.target.value)}
                  className="bg-white dark:bg-[#191a1d] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1.5 text-xs w-full"
                >
                  <option value="">{label} — not selected</option>
                  {sortedPlayers.map((pl) => (
                    <option key={pl.player_master_id} value={pl.player_master_id}>
                      {pl.player_name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface FormationStat {
  formation: string;
  played: number;
  w: number;
  d: number;
  l: number;
}

function WinRateDonut({ w, d, l, winRate }: { w: number; d: number; l: number; winRate: number }) {
  const played = w + d + l;
  const SIZE = 176;
  const R = 76;
  const STROKE = 26;
  const CIRC = 2 * Math.PI * R;

  const segments = [
    { count: w, color: "#10b981" }, // emerald-500
    { count: d, color: "#6b7280" }, // gray-500
    { count: l, color: "#ef4444" }, // red-500
  ].filter((s) => s.count > 0);

  let cumulative = 0;

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#0e0e10" strokeWidth={STROKE} />
        {segments.map((s, i) => {
          const len = (s.count / played) * CIRC;
          const offset = -cumulative;
          cumulative += len;
          return (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${len} ${CIRC - len}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{winRate}%</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">Win Rate</span>
      </div>
    </div>
  );
}

const DEPTH_LABELS = ["Option 1", "Option 2", "Option 3"];

function LineupEditor({
  slots,
  lineup,
  players,
  onChange,
}: {
  slots: Slot[];
  lineup: Lineup;
  players: NexusPlayerRow[];
  onChange: (slotKey: string, depth: 0 | 1 | 2, playerId: string) => void;
}) {
  const sortedPlayers = players.slice().sort((a, b) => a.player_name.localeCompare(b.player_name));

  return (
    <div className="mt-6 pt-5 border-t border-gray-200 dark:border-[#2a2b30]">
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Lineup</h4>
      <p className="text-xs text-gray-500 mb-4">
        Fill in players per position — Option 1 appears on the diagram, Options 2/3 serve as backup choices. Saved in this browser.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {slots.map((slot) => {
          const depth = lineup[slot.key] ?? ["", "", ""];
          return (
            <div key={slot.key} className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-3">
              <div className="text-xs font-bold text-blue-600 dark:text-[#ffcf4d] mb-2">{slot.displayLabel}</div>
              <div className="flex flex-col gap-1.5">
                {DEPTH_LABELS.map((label, i) => (
                  <select
                    key={label}
                    value={depth[i]}
                    onChange={(e) => onChange(slot.key, i as 0 | 1 | 2, e.target.value)}
                    className="bg-white dark:bg-[#191a1d] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1.5 text-xs w-full"
                  >
                    <option value="">{label} — not selected</option>
                    {sortedPlayers.map((p) => (
                      <option key={p.player_master_id} value={p.player_master_id}>
                        {p.player_name}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FormationPitchCard({
  teamName,
  logoUrl,
  players,
}: {
  teamName: string;
  logoUrl?: string | null;
  players: NexusPlayerRow[];
}) {
  const matchLog = MATCH_LOG_BY_TEAM[teamName] ?? [];
  const ownShort = OWN_SHORT_BY_TEAM[teamName] ?? teamName;
  const statsMap = new Map<string, FormationStat>();
  for (const entry of matchLog) {
    const { teamFormation } = opponentOf(entry, ownShort);
    const s = statsMap.get(teamFormation) ?? { formation: teamFormation, played: 0, w: 0, d: 0, l: 0 };
    s.played += 1;
    if (entry.result === "W") s.w += 1;
    else if (entry.result === "D") s.d += 1;
    else s.l += 1;
    statsMap.set(teamFormation, s);
  }
  const options = Array.from(statsMap.values()).sort((a, b) => b.played - a.played);

  const [formation, setFormation] = useState(options[0]?.formation ?? "4-3-3");
  const stat = statsMap.get(formation)!;
  const winRate = Math.round((stat.w / stat.played) * 100);

  const [lineups, setLineups] = useState<Record<string, Lineup>>({});
  const [lineupsLoading, setLineupsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLineupsLoading(true);
    fetchLineups(teamName).then((rows) => {
      if (!cancelled) {
        setLineups(groupLineupRows(rows));
        setLineupsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  const baseSlots = getSlots(formation);
  const lineup = lineups[formation] ?? {};

  const [savedPositions, setSavedPositions] = useState<Record<string, PositionMap>>({});
  const [positionsLoading, setPositionsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setPositionsLoading(true);
    fetchSlotPositions(teamName).then((rows) => {
      if (!cancelled) {
        setSavedPositions(groupPositionRows(rows));
        setPositionsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [teamName]);

  const isLoadingRoster = lineupsLoading || positionsLoading;

  const [isEditing, setIsEditing] = useState(false);
  const [draftPositions, setDraftPositions] = useState<PositionMap>({});
  const [savingPositions, setSavingPositions] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Leaving the formation dropdown mid-edit would silently drag the wrong
  // formation's slots — bail out of edit mode instead.
  useEffect(() => {
    setIsEditing(false);
  }, [formation]);

  function startEditingPositions() {
    const seed: PositionMap = {};
    for (const slot of baseSlots) {
      seed[slot.key] = savedPositions[formation]?.[slot.key] ?? { x: slot.x, y: slot.y };
    }
    setDraftPositions(seed);
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditingPositions() {
    setIsEditing(false);
    setDraftPositions({});
    setSaveError(null);
  }

  async function saveEditingPositions() {
    setSavingPositions(true);
    const result = await saveSlotPositions(teamName, formation, draftPositions);
    setSavingPositions(false);
    if (!result.ok) {
      setSaveError(`Failed to save position: ${result.message ?? "unknown error"}`);
      return; // stay in edit mode so nothing is silently lost
    }
    setSavedPositions((prev) => ({ ...prev, [formation]: draftPositions }));
    setSaveError(null);
    setIsEditing(false);
  }

  function handleSlotDrag(slotKey: string, x: number, y: number) {
    setDraftPositions((prev) => ({ ...prev, [slotKey]: { x, y } }));
  }

  const slots: Slot[] = baseSlots.map((slot) => {
    const pos = isEditing ? draftPositions[slot.key] : savedPositions[formation]?.[slot.key];
    return pos ? { ...slot, x: pos.x, y: pos.y } : slot;
  });

  async function handleLineupChange(slotKey: string, depth: 0 | 1 | 2, playerId: string) {
    const playerName = playerId ? players.find((p) => String(p.player_master_id) === playerId)?.player_name ?? "" : "";

    setLineups((prev) => {
      const prevFormationLineup = prev[formation] ?? {};
      const prevSlot: SlotDepth = prevFormationLineup[slotKey] ?? ["", "", ""];
      const nextSlot: SlotDepth = [...prevSlot] as SlotDepth;
      nextSlot[depth] = playerId;
      return { ...prev, [formation]: { ...prevFormationLineup, [slotKey]: nextSlot } };
    });

    const result = await saveLineupSlot({
      team: teamName,
      formation,
      slotKey,
      depth: (depth + 1) as 1 | 2 | 3,
      playerId,
      playerName,
    });
    if (!result.ok) setSaveError(`Failed to save player selection: ${result.message ?? "unknown error"}`);
    else setSaveError(null);
  }

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Formation Diagram</h3>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={cancelEditingPositions}
                disabled={savingPositions}
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2"
              >
                Cancel
              </button>
              <button
                onClick={saveEditingPositions}
                disabled={savingPositions}
                className="text-xs font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-3 py-2 disabled:opacity-60"
              >
                {savingPositions ? "Saving…" : "Save Position"}
              </button>
            </>
          ) : (
            <button
              onClick={startEditingPositions}
              className="text-xs font-semibold text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#26272c]"
            >
              Edit Position
            </button>
          )}
          <select
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
            className="bg-gray-100 dark:bg-[#26272c] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md p-2 text-sm"
          >
            {options.map((o) => (
              <option key={o.formation} value={o.formation}>
                {o.formation} ({o.played}x)
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingRoster && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-[#ffcf4d] animate-spin" />
          Loading… accessing our database
        </p>
      )}

      {isEditing && !saveError && (
        <p className="text-xs text-blue-600 dark:text-[#ffcf4d] mb-4">
          Edit mode active — drag the position bubbles on the diagram, then click Save Position.
        </p>
      )}

      {saveError && <p className="text-xs text-red-500 dark:text-red-400 mb-4">⚠ {saveError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] gap-5">
        <FormationPitchSVG
          formation={formation}
          teamName={teamName}
          logoUrl={logoUrl}
          slots={slots}
          lineup={lineup}
          players={players}
          onDepthChange={handleLineupChange}
          isEditing={isEditing}
          onSlotDrag={handleSlotDrag}
        />

        <div className="flex flex-col gap-6">
          <div>
            <div className="font-mono font-extrabold text-3xl text-gray-900 dark:text-white">{formation}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.played} matches played this season</div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-8">
            <WinRateDonut w={stat.w} d={stat.d} l={stat.l} winRate={winRate} />

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <div className="flex items-center justify-between text-base border-b border-gray-200 dark:border-[#2a2b30] pb-2.5">
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Win
                </span>
                <span className="text-gray-900 dark:text-white font-bold">{stat.w}</span>
              </div>
              <div className="flex items-center justify-between text-base border-b border-gray-200 dark:border-[#2a2b30] pb-2.5">
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> Draw
                </span>
                <span className="text-gray-900 dark:text-white font-bold">{stat.d}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2 text-red-500 dark:text-red-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Loss
                </span>
                <span className="text-gray-900 dark:text-white font-bold">{stat.l}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LineupEditor slots={slots} lineup={lineup} players={players} onChange={handleLineupChange} />
    </div>
  );
}
