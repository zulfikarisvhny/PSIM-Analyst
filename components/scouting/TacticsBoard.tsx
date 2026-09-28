// components/scouting/TacticsBoard.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowElement,
  BoardElement,
  BoardTeamColor,
  PlayerElement,
  PolygonElement,
  TacticsBoardRow,
  createBoard,
  deleteBoard,
  fetchBoards,
  updateBoard,
} from "@/lib/scouting/tacticsBoards";
import { NexusPlayerRow, fetchTeamPlayers } from "@/lib/scouting/players";

type Tool =
  | "select"
  | "player-home"
  | "player-away"
  | "ball"
  | "pen"
  | "arrow"
  | "rect"
  | "circle"
  | "polydraw"
  | "polyline"
  | "text"
  | "formation"
  | "ruler";

const PITCH_W = 900;
const PITCH_H = 583;
const SCALE = PITCH_W / 105;
const BOX_DEPTH = Math.round(16.5 * SCALE);
const BOX_SPAN = Math.round(40.3 * SCALE);
const SIX_DEPTH = Math.round(5.5 * SCALE);
const SIX_SPAN = Math.round(18.32 * SCALE);
const CIRCLE_R = Math.round(9.15 * SCALE);
const PEN_SPOT_DIST = Math.round(11 * SCALE);
const PITCH_BG = "#ffffff";
const STROKE = "#1a1a1a";

const COLORS = ["#ef4444", "#3b82f6", "#f5c518", "#ffffff", "#111827"];
const TEAM_FILL: Record<BoardTeamColor, string> = { home: "#ef4444", away: "#3b82f6" };
const PLAYER_R = 16;
const MIN_DRAG = 6; // px in viewBox units — below this, an arrow/rect/circle draft is discarded as an accidental click
const SNAP_R = 24; // release radius around a player marker that anchors an arrow endpoint to it

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Live endpoints for an arrow: an anchored end tracks its player's current x/y instead of the stored, possibly-stale x1/y1 (or x2/y2). */
function arrowEndpoints(el: ArrowElement, elements: BoardElement[]) {
  const from = el.fromPlayerId ? (elements.find((e) => e.id === el.fromPlayerId) as PlayerElement | undefined) : undefined;
  const to = el.toPlayerId ? (elements.find((e) => e.id === el.toPlayerId) as PlayerElement | undefined) : undefined;
  return {
    x1: from ? from.x : el.x1,
    y1: from ? from.y : el.y1,
    x2: to ? to.x : el.x2,
    y2: to ? to.y : el.y2,
    fromAnchored: !!from,
    toAnchored: !!to,
  };
}

/** Live vertices for a polygon: an anchored vertex tracks its player's current x/y instead of the stored fallback. */
function polygonPoints(el: PolygonElement, elements: BoardElement[]) {
  return el.points.map((p) => {
    const player = p.playerId ? (elements.find((e) => e.id === p.playerId) as PlayerElement | undefined) : undefined;
    return player ? { x: player.x, y: player.y } : { x: p.x, y: p.y };
  });
}

/** Pulls each anchored end in from the player's center to the edge of its marker, so the line/arrowhead doesn't run under the number. */
function trimToMarkerEdges(x1: number, y1: number, x2: number, y2: number, fromAnchored: boolean, toAnchored: boolean) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: fromAnchored ? x1 + ux * PLAYER_R : x1,
    y1: fromAnchored ? y1 + uy * PLAYER_R : y1,
    x2: toAnchored ? x2 - ux * PLAYER_R : x2,
    y2: toAnchored ? y2 - uy * PLAYER_R : y2,
  };
}

/** Reference point used as the drag origin for whole-element moves — every BoardElement variant that can be dragged as a unit. */
function getElementOrigin(el: BoardElement): { x: number; y: number } {
  if (el.type === "arrow") return { x: el.x1, y: el.y1 };
  if (el.type === "path") return { x: el.points[0].x, y: el.points[0].y };
  if (el.type === "polygon") return { x: 0, y: 0 }; // unused — polygon drag is blocked before this is read
  return { x: el.x, y: el.y }; // player, ball, text, rect, circle
}

const FORMATIONS = ["4-4-2", "4-3-3", "4-2-3-1", "4-1-4-1", "3-5-2", "3-4-3", "5-3-2", "4-5-1"];
const FORM_PAD_X = 70;
const FORM_PAD_Y = 50;

type LineRole = "def" | "dm" | "mid" | "am" | "att";

const FORMATION_LABELS: Record<LineRole, (n: number) => string[]> = {
  def: (n) => (n === 3 ? ["CB", "CB", "CB"] : n === 4 ? ["LB", "CB", "CB", "RB"] : n === 5 ? ["LWB", "CB", "CB", "CB", "RWB"] : Array(n).fill("CB")),
  dm: (n) => (n <= 1 ? ["CDM"] : Array(n).fill("CDM")),
  mid: (n) =>
    n === 2 ? ["CM", "CM"] : n === 3 ? ["CM", "CM", "CM"] : n === 4 ? ["LM", "CM", "CM", "RM"] : n === 5 ? ["LM", "CM", "CM", "CM", "RM"] : Array(n).fill("CM"),
  am: (n) => (n === 1 ? ["CAM"] : n === 2 ? ["CAM", "CAM"] : n === 3 ? ["LW", "CAM", "RW"] : Array(n).fill("CAM")),
  att: (n) => (n === 1 ? ["ST"] : n === 2 ? ["ST", "ST"] : n === 3 ? ["LW", "ST", "RW"] : Array(n).fill("FW")),
};

function getFormationLineLayout(formation: string): { role: LineRole; count: number }[] {
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

/** 11 landscape slot positions for a formation, mirrored so "home" attacks right-to-left→right and "away" attacks the opposite way. */
function getFormationSlots(formation: string, side: BoardTeamColor): { x: number; y: number; label: string }[] {
  const lines = getFormationLineLayout(formation);
  const numLines = lines.length + 1; // +1 for GK
  const ownGoalX = side === "home" ? FORM_PAD_X : PITCH_W - FORM_PAD_X;
  const frontX = side === "home" ? PITCH_W * 0.46 : PITCH_W * 0.54;
  const xFor = (lineIdx: number) => {
    const t = numLines === 1 ? 0 : lineIdx / (numLines - 1);
    return ownGoalX + t * (frontX - ownGoalX);
  };
  const spanY = PITCH_H - 2 * FORM_PAD_Y;

  const slots: { x: number; y: number; label: string }[] = [{ x: xFor(0), y: PITCH_H / 2, label: "GK" }];
  lines.forEach((line, i) => {
    const labels = FORMATION_LABELS[line.role](line.count);
    const x = xFor(i + 1);
    labels.forEach((label, j) => {
      const y = FORM_PAD_Y + ((j + 0.5) / line.count) * spanY;
      slots.push({ x, y, label });
    });
  });
  return slots;
}

function PitchMarkings() {
  const cx = PITCH_W / 2;
  const cy = PITCH_H / 2;
  return (
    <>
      <rect x={4} y={4} width={PITCH_W - 8} height={PITCH_H - 8} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <line x1={cx} y1={4} x2={cx} y2={PITCH_H - 4} stroke={STROKE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={CIRCLE_R} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2.5} fill={STROKE} />

      {/* Left goal */}
      <rect x={4} y={(PITCH_H - BOX_SPAN) / 2} width={BOX_DEPTH} height={BOX_SPAN} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <rect x={4} y={(PITCH_H - SIX_SPAN) / 2} width={SIX_DEPTH} height={SIX_SPAN} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <circle cx={4 + PEN_SPOT_DIST} cy={cy} r={2.5} fill={STROKE} />
      <path
        d={`M ${4 + BOX_DEPTH} ${cy - 44} A 44 44 0 0 1 ${4 + BOX_DEPTH} ${cy + 44}`}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
      />

      {/* Right goal */}
      <rect
        x={PITCH_W - 4 - BOX_DEPTH}
        y={(PITCH_H - BOX_SPAN) / 2}
        width={BOX_DEPTH}
        height={BOX_SPAN}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
      />
      <rect
        x={PITCH_W - 4 - SIX_DEPTH}
        y={(PITCH_H - SIX_SPAN) / 2}
        width={SIX_DEPTH}
        height={SIX_SPAN}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
      />
      <circle cx={PITCH_W - 4 - PEN_SPOT_DIST} cy={cy} r={2.5} fill={STROKE} />
      <path
        d={`M ${PITCH_W - 4 - BOX_DEPTH} ${cy - 44} A 44 44 0 0 0 ${PITCH_W - 4 - BOX_DEPTH} ${cy + 44}`}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
      />

      {/* Corner arcs */}
      <path d={`M 4 12 A 8 8 0 0 1 12 4`} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <path d={`M ${PITCH_W - 12} 4 A 8 8 0 0 1 ${PITCH_W - 4} 12`} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <path d={`M 4 ${PITCH_H - 12} A 8 8 0 0 0 12 ${PITCH_H - 4}`} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <path
        d={`M ${PITCH_W - 12} ${PITCH_H - 4} A 8 8 0 0 0 ${PITCH_W - 4} ${PITCH_H - 12}`}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
      />
    </>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 shrink-0 rounded-md border flex items-center justify-center text-sm font-bold transition-colors ${
        active
          ? "bg-blue-600 dark:bg-[#ffcf4d] border-blue-600 dark:border-[#ffcf4d] text-white dark:text-[#0e0e10]"
          : "bg-white dark:bg-[#191a1d] border-gray-200 dark:border-[#2a2b30] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
      }`}
    >
      {children}
    </button>
  );
}

export function TacticsBoard({
  teamName,
  players,
}: {
  teamName: string;
  players: NexusPlayerRow[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  // Locked to the site's existing "next opponent" convention (see the header
  // badge and HeadToHead/StyleMap on other tabs) rather than a free picker —
  // every scouting page treats PSIM Yogyakarta as the fixed rival.
  const awayTeam = "PSIM Yogyakarta";
  const [awayPlayers, setAwayPlayers] = useState<NexusPlayerRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchTeamPlayers(awayTeam).then((rows) => {
      if (!cancelled) setAwayPlayers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [boards, setBoards] = useState<TacticsBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Board");
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [dirty, setDirty] = useState(false);

  const HISTORY_LIMIT = 50;
  const [past, setPast] = useState<BoardElement[][]>([]);
  const [future, setFuture] = useState<BoardElement[][]>([]);

  const [tool, setTool] = useState<Tool>("select");
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [dashed, setDashed] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]); // player ids picked with Shift+click, for "Generate Polygon"

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formationSide, setFormationSide] = useState<BoardTeamColor>("home");
  const [formationChoice, setFormationChoice] = useState(FORMATIONS[1]);

  type Draft = { type: "arrow" | "rect" | "circle"; x1: number; y1: number; x2: number; y2: number; fromPlayerId?: string };
  const draftRef = useRef<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  // Pen (freehand drag) and polyline/polygon (click-to-add-point) share this point list.
  const pathDraftRef = useRef<{ x: number; y: number }[] | null>(null);
  const [pathDraft, setPathDraft] = useState<{ x: number; y: number }[] | null>(null);
  const penActiveRef = useRef(false);
  const [cursorPt, setCursorPt] = useState<{ x: number; y: number } | null>(null);

  const rulerRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [ruler, setRuler] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Switching tools mid-draw would otherwise leave a stale draft/preview behind.
  useEffect(() => {
    draftRef.current = null;
    setDraft(null);
    pathDraftRef.current = null;
    setPathDraft(null);
    penActiveRef.current = false;
    rulerRef.current = null;
    setRuler(null);
  }, [tool]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBoards(teamName).then((rows) => {
      if (cancelled) return;
      setBoards(rows);
      setLoading(false);
      if (rows.length) {
        loadBoard(rows[0]);
      } else {
        newBoard();
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "Escape" && pathDraftRef.current) {
        pathDraftRef.current = null;
        setPathDraft(null);
        return;
      }
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteElement(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, past, future, elements]);

  function loadBoard(board: TacticsBoardRow) {
    setActiveBoardId(board.id);
    setTitle(board.title);
    setElements(board.elements);
    setSelectedId(null);
    setDirty(false);
    setSaveError(null);
    setPast([]);
    setFuture([]);
  }

  function newBoard() {
    setActiveBoardId(null);
    setTitle("Untitled Board");
    setElements([]);
    setSelectedId(null);
    setDirty(false);
    setSaveError(null);
    setPast([]);
    setFuture([]);
  }

  /** Every discrete edit (add/rename/recolor/delete/etc.) goes through here so it becomes one undo step. */
  function commitElements(updater: (prev: BoardElement[]) => BoardElement[]) {
    setPast([...past, elements].slice(-HISTORY_LIMIT));
    setFuture([]);
    setElements(updater(elements));
    setDirty(true);
  }

  /** Used only for the many intermediate positions during a drag — the pre-drag position is the undo target, not each pixel of movement. */
  function applyElementsLive(updater: (prev: BoardElement[]) => BoardElement[]) {
    setElements((prev) => updater(prev));
    setDirty(true);
  }

  function beginHistoryCheckpoint() {
    setPast([...past, elements].slice(-HISTORY_LIMIT));
    setFuture([]);
  }

  function undo() {
    if (past.length === 0) return;
    const prevState = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([elements, ...future]);
    setElements(prevState);
    setDirty(true);
    setSelectedId(null);
    setMultiSelected([]);
  }

  function redo() {
    if (future.length === 0) return;
    const nextState = future[0];
    setFuture(future.slice(1));
    setPast([...past, elements]);
    setElements(nextState);
    setDirty(true);
    setSelectedId(null);
    setMultiSelected([]);
  }

  function addElement(el: BoardElement) {
    commitElements((prev) => [...prev, el]);
  }

  function updateElement(id: string, patch: Partial<BoardElement>) {
    commitElements((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as BoardElement) : el)));
  }

  function updateElementLive(id: string, patch: Partial<BoardElement>) {
    applyElementsLive((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as BoardElement) : el)));
  }

  function deleteElement(id: string) {
    commitElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function clearAll() {
    if (elements.length && !confirm("Clear every element on this board?")) return;
    commitElements(() => []);
    setSelectedId(null);
  }

  function placeFormation() {
    const existing = elements.filter((el): el is PlayerElement => el.type === "player" && el.color === formationSide);
    const sideLabel = formationSide === "home" ? teamName : awayTeam || "Away";
    if (existing.length && !confirm(`Replace ${existing.length} existing ${sideLabel} player(s) already on the board?`)) return;

    const existingIds = new Set(existing.map((el) => el.id));
    const slots = getFormationSlots(formationChoice, formationSide);
    const newPlayers: PlayerElement[] = slots.map((s, i) => ({
      id: uid(),
      type: "player",
      x: s.x,
      y: s.y,
      number: i + 1,
      color: formationSide,
    }));

    commitElements((prev) => [...prev.filter((el) => !existingIds.has(el.id)), ...newPlayers]);
    setSelectedId(null);
  }

  const NUDGE_STEP = 10;

  function nudgeFormation(side: BoardTeamColor, dx: number, dy: number) {
    commitElements((prev) =>
      prev.map((el) =>
        el.type === "player" && el.color === side
          ? { ...el, x: Math.min(PITCH_W - 2, Math.max(2, el.x + dx)), y: Math.min(PITCH_H - 2, Math.max(2, el.y + dy)) }
          : el
      )
    );
  }

  function scaleFormation(side: BoardTeamColor, axis: "x" | "y", factor: number) {
    const group = elements.filter((el): el is PlayerElement => el.type === "player" && el.color === side);
    if (!group.length) return;
    const vals = group.map((p) => p[axis]);
    const center = (Math.min(...vals) + Math.max(...vals)) / 2;
    const max = axis === "x" ? PITCH_W - 2 : PITCH_H - 2;
    commitElements((prev) =>
      prev.map((el) => {
        if (el.type !== "player" || el.color !== side) return el;
        const v = Math.min(max, Math.max(2, center + (el[axis] - center) * factor));
        return { ...el, [axis]: v };
      })
    );
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const result: { ok: boolean; message?: string; id?: string } = activeBoardId
      ? await updateBoard(activeBoardId, title, elements)
      : await createBoard(teamName, title, elements);
    setSaving(false);
    if (!result.ok) {
      setSaveError(`Failed to save: ${result.message ?? "unknown error"}`);
      return;
    }
    setDirty(false);
    const rows = await fetchBoards(teamName);
    setBoards(rows);
    if (!activeBoardId && result.id) setActiveBoardId(result.id);
  }

  async function removeBoard(id: string) {
    if (!confirm("Delete this board? This can't be undone.")) return;
    const result = await deleteBoard(id);
    if (!result.ok) {
      setSaveError(`Failed to delete: ${result.message ?? "unknown error"}`);
      return;
    }
    const rows = await fetchBoards(teamName);
    setBoards(rows);
    if (activeBoardId === id) {
      if (rows.length) loadBoard(rows[0]);
      else newBoard();
    }
  }

  function toPoint(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PITCH_W;
    const y = ((e.clientY - rect.top) / rect.height) * PITCH_H;
    return { x: Math.min(PITCH_W - 2, Math.max(2, x)), y: Math.min(PITCH_H - 2, Math.max(2, y)) };
  }

  function handleSvgPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const pt = toPoint(e);

    if (tool === "player-home" || tool === "player-away") {
      const color: BoardTeamColor = tool === "player-home" ? "home" : "away";
      const count = elements.filter((el) => el.type === "player" && el.color === color).length;
      const id = uid();
      addElement({ id, type: "player", x: pt.x, y: pt.y, number: count + 1, color });
      setSelectedId(id);
      setTool("select");
      return;
    }

    if (tool === "ball") {
      addElement({ id: uid(), type: "ball", x: pt.x, y: pt.y });
      return;
    }

    if (tool === "text") {
      const id = uid();
      addElement({ id, type: "text", x: pt.x, y: pt.y, text: "Text", color: currentColor });
      setSelectedId(id);
      setTool("select");
      return;
    }

    if (tool === "pen") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      penActiveRef.current = true;
      pathDraftRef.current = [pt];
      setPathDraft(pathDraftRef.current);
      return;
    }

    if (tool === "polyline" || tool === "polydraw") {
      pathDraftRef.current = pathDraftRef.current ? [...pathDraftRef.current, pt] : [pt];
      setPathDraft(pathDraftRef.current);
      return;
    }

    if (tool === "ruler") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      rulerRef.current = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
      setRuler(rulerRef.current);
      return;
    }

    if (tool === "arrow" || tool === "rect" || tool === "circle") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      draftRef.current = { type: tool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
      setDraft(draftRef.current);
      return;
    }

    setSelectedId(null);
    setMultiSelected([]);
  }

  function handleSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pt = toPoint(e);

    if (tool === "polyline" || tool === "polydraw") setCursorPt(pt);

    if (tool === "pen" && penActiveRef.current && pathDraftRef.current) {
      const last = pathDraftRef.current[pathDraftRef.current.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) >= 5) {
        pathDraftRef.current = [...pathDraftRef.current, pt];
        setPathDraft(pathDraftRef.current);
      }
      return;
    }

    if (rulerRef.current) {
      rulerRef.current = { ...rulerRef.current, x2: pt.x, y2: pt.y };
      setRuler(rulerRef.current);
      return;
    }

    if (!draftRef.current) return;
    draftRef.current = { ...draftRef.current, x2: pt.x, y2: pt.y };
    setDraft(draftRef.current);
  }

  function handleSvgDoubleClick() {
    if (tool !== "polyline" && tool !== "polydraw") return;
    const raw = pathDraftRef.current;
    pathDraftRef.current = null;
    setPathDraft(null);
    if (!raw) return;
    // dblclick fires two extra pointerdowns at ~the same spot right before it — collapse those near-duplicates.
    const pts = raw.filter((p, i) => i === 0 || Math.hypot(p.x - raw[i - 1].x, p.y - raw[i - 1].y) > 3);
    const closed = tool === "polydraw";
    if (pts.length < (closed ? 3 : 2)) return;
    const id = uid();
    addElement({ id, type: "path", points: pts, closed, color: currentColor, strokeWidth: currentWidth });
    setSelectedId(id);
    setTool("select");
  }

  function handleSvgPointerUp() {
    if (tool === "pen" && penActiveRef.current) {
      penActiveRef.current = false;
      const pts = pathDraftRef.current;
      pathDraftRef.current = null;
      setPathDraft(null);
      if (pts && pts.length >= 2) {
        addElement({ id: uid(), type: "path", points: pts, closed: false, color: currentColor, strokeWidth: currentWidth });
      }
      return;
    }

    if (rulerRef.current) {
      rulerRef.current = null;
      setRuler(null);
      return;
    }

    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!d) return;
    const dist = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
    if (dist < MIN_DRAG) return;

    if (d.type === "arrow") {
      const toPlayer = elements.find(
        (el): el is PlayerElement =>
          el.type === "player" && el.id !== d.fromPlayerId && Math.hypot(el.x - d.x2, el.y - d.y2) <= SNAP_R
      );
      addElement({
        id: uid(),
        type: "arrow",
        x1: d.x1,
        y1: d.y1,
        x2: toPlayer ? toPlayer.x : d.x2,
        y2: toPlayer ? toPlayer.y : d.y2,
        dashed,
        color: currentColor,
        strokeWidth: currentWidth,
        fromPlayerId: d.fromPlayerId,
        toPlayerId: toPlayer?.id,
      });
    } else if (d.type === "rect") {
      addElement({
        id: uid(),
        type: "rect",
        x: Math.min(d.x1, d.x2),
        y: Math.min(d.y1, d.y2),
        w: Math.abs(d.x2 - d.x1),
        h: Math.abs(d.y2 - d.y1),
        color: currentColor,
      });
    } else {
      addElement({ id: uid(), type: "circle", x: d.x1, y: d.y1, w: dist, h: dist, color: currentColor });
    }
  }

  function handlePlayerPointerDownForArrow(e: React.PointerEvent, player: PlayerElement) {
    if (tool !== "arrow") return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    draftRef.current = { type: "arrow", x1: player.x, y1: player.y, x2: player.x, y2: player.y, fromPlayerId: player.id };
    setDraft(draftRef.current);
  }

  function handlePlayerPointerDown(e: React.PointerEvent, player: PlayerElement) {
    if (tool === "arrow") {
      handlePlayerPointerDownForArrow(e, player);
      return;
    }
    if (tool === "select" && e.shiftKey) {
      e.stopPropagation();
      setSelectedId(null);
      setMultiSelected((prev) => (prev.includes(player.id) ? prev.filter((id) => id !== player.id) : [...prev, player.id]));
      return;
    }
    setMultiSelected([]);
    handleElPointerDown(e, player);
  }

  function generatePolygon() {
    if (multiSelected.length < 3) return;
    const points = multiSelected
      .map((id) => elements.find((el) => el.id === id))
      .filter((el): el is PlayerElement => !!el && el.type === "player")
      .map((el) => ({ x: el.x, y: el.y, playerId: el.id }));
    if (points.length < 3) return;
    const id = uid();
    addElement({ id, type: "polygon", points, color: currentColor });
    setMultiSelected([]);
    setSelectedId(id);
  }

  function handleElPointerDown(e: React.PointerEvent, el: BoardElement) {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(el.id);
    setMultiSelected([]);
    if (el.type === "arrow" && (el.fromPlayerId || el.toPlayerId)) return; // anchored — moves via its player(s), not by dragging the line
    if (el.type === "polygon") return; // vertices track their players, not draggable as a whole
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    beginHistoryCheckpoint(); // one undo step for the whole drag, not per pixel of movement
    const pt = toPoint(e);
    const origin = getElementOrigin(el);
    dragRef.current = { id: el.id, dx: pt.x - origin.x, dy: pt.y - origin.y };
  }

  function handleElPointerMove(e: React.PointerEvent, el: BoardElement) {
    if (!dragRef.current || dragRef.current.id !== el.id) return;
    const pt = toPoint(e);
    const nx = pt.x - dragRef.current.dx;
    const ny = pt.y - dragRef.current.dy;
    if (el.type === "arrow") {
      const ddx = nx - el.x1;
      const ddy = ny - el.y1;
      updateElementLive(el.id, { x1: nx, y1: ny, x2: el.x2 + ddx, y2: el.y2 + ddy } as Partial<BoardElement>);
    } else if (el.type === "path") {
      const ddx = nx - el.points[0].x;
      const ddy = ny - el.points[0].y;
      updateElementLive(el.id, { points: el.points.map((p) => ({ x: p.x + ddx, y: p.y + ddy })) } as Partial<BoardElement>);
    } else {
      updateElementLive(el.id, { x: nx, y: ny } as Partial<BoardElement>);
    }
  }

  function handleElPointerUp() {
    dragRef.current = null;
  }

  function recolorSelected(color: string) {
    setCurrentColor(color);
    if (selectedId) {
      const el = elements.find((x) => x.id === selectedId);
      if (el && el.type !== "player") updateElement(selectedId, { color } as Partial<BoardElement>);
    }
  }

  function toggleDashedSelected() {
    const next = !dashed;
    setDashed(next);
    if (selectedId) {
      const el = elements.find((x) => x.id === selectedId);
      if (el && el.type === "arrow") updateElement(selectedId, { dashed: next } as Partial<BoardElement>);
    }
  }

  function setWidthSelected(width: number) {
    setCurrentWidth(width);
    if (selectedId) {
      const el = elements.find((x) => x.id === selectedId);
      if (el && (el.type === "arrow" || el.type === "path")) updateElement(selectedId, { strokeWidth: width } as Partial<BoardElement>);
    }
  }

  function exportPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(PITCH_W));
    clone.setAttribute("height", String(PITCH_H));
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", String(PITCH_W));
    bg.setAttribute("height", String(PITCH_H));
    bg.setAttribute("fill", PITCH_BG);
    clone.insertBefore(bg, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgUrl = "data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(svgData)));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = PITCH_W * scale;
      canvas.height = PITCH_H * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "tactics-board"}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = svgUrl;
  }

  const selectedEl = elements.find((el) => el.id === selectedId);

  function toolLabel(t: Tool): string {
    switch (t) {
      case "select":
        return "Select";
      case "pen":
        return "Pen";
      case "player-home":
        return `Add ${teamName} Player`;
      case "player-away":
        return `Add ${awayTeam} Player`;
      case "ball":
        return "Add Ball";
      case "arrow":
        return "Arrow";
      case "rect":
        return "Rectangle Zone";
      case "circle":
        return "Circle Zone";
      case "polydraw":
        return "Polygon";
      case "polyline":
        return "Polyline";
      case "text":
        return "Text";
      case "formation":
        return "Formation";
      case "ruler":
        return "Measure";
    }
  }

  function colorDashWidthControls(showDashed: boolean, showWidth: boolean) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Color</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => recolorSelected(c)}
                title={c}
                className={`w-6 h-6 rounded-full border-2 shrink-0 ${
                  currentColor === c ? "border-blue-600 dark:border-[#ffcf4d]" : "border-gray-200 dark:border-[#2a2b30]"
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              value={currentColor}
              onChange={(e) => recolorSelected(e.target.value)}
              title="Custom color"
              className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-[#2a2b30] p-0 bg-transparent cursor-pointer shrink-0"
            />
          </div>
        </div>
        {showDashed && (
          <button
            onClick={toggleDashedSelected}
            className={`text-xs font-semibold rounded-md px-3 py-2 border text-left ${
              dashed
                ? "bg-blue-600 dark:bg-[#ffcf4d] border-blue-600 dark:border-[#ffcf4d] text-white dark:text-[#0e0e10]"
                : "bg-white dark:bg-[#191a1d] border-gray-200 dark:border-[#2a2b30] text-gray-700 dark:text-gray-200"
            }`}
          >
            {dashed ? "Dashed: On" : "Dashed: Off"}
          </button>
        )}
        {showWidth && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stroke width: {currentWidth}</p>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={currentWidth}
              onChange={(e) => setWidthSelected(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5 ${
        isFullscreen ? "h-screen overflow-y-auto" : ""
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[220px_56px_1fr] gap-5">
        <div>
          <div className="mb-5 pb-5 border-b border-gray-200 dark:border-[#2a2b30]">
            {multiSelected.length > 0 ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Selection</h3>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {multiSelected.length} player{multiSelected.length > 1 ? "s" : ""} selected
                  </p>
                  {multiSelected.length >= 3 && (
                    <button
                      onClick={generatePolygon}
                      className="text-xs font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-3 py-2"
                    >
                      Generate Polygon
                    </button>
                  )}
                  <button
                    onClick={() => setMultiSelected([])}
                    className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-left"
                  >
                    Clear selection
                  </button>
                </div>
              </>
            ) : tool === "formation" ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Formation</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setFormationSide("home")}
                    className={`flex-1 text-xs font-bold rounded-md px-2 py-2 border truncate ${
                      formationSide === "home"
                        ? "bg-blue-600 dark:bg-[#ffcf4d] border-blue-600 dark:border-[#ffcf4d] text-white dark:text-[#0e0e10]"
                        : "border-gray-200 dark:border-[#2a2b30] text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {teamName}
                  </button>
                  <button
                    onClick={() => setFormationSide("away")}
                    className={`flex-1 text-xs font-bold rounded-md px-2 py-2 border truncate ${
                      formationSide === "away"
                        ? "bg-blue-600 dark:bg-[#ffcf4d] border-blue-600 dark:border-[#ffcf4d] text-white dark:text-[#0e0e10]"
                        : "border-gray-200 dark:border-[#2a2b30] text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {awayTeam}
                  </button>
                </div>

                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Formation</label>
                <select
                  value={formationChoice}
                  onChange={(e) => setFormationChoice(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1.5 text-xs text-gray-900 dark:text-white mb-3"
                >
                  {FORMATIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <button
                  onClick={placeFormation}
                  className="w-full text-xs font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-3 py-2 mb-4"
                >
                  Place
                </button>

                <p className="text-xs font-bold text-gray-900 dark:text-white mb-2">
                  Position Adjustment — {formationSide === "home" ? teamName : awayTeam}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    onClick={() => scaleFormation(formationSide, "x", 0.85)}
                    className="text-[11px] font-semibold border border-gray-200 dark:border-[#2a2b30] rounded-md px-1.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                  >
                    Compress W
                  </button>
                  <button
                    onClick={() => scaleFormation(formationSide, "x", 1.15)}
                    className="text-[11px] font-semibold border border-gray-200 dark:border-[#2a2b30] rounded-md px-1.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                  >
                    Expand W
                  </button>
                  <button
                    onClick={() => scaleFormation(formationSide, "y", 0.85)}
                    className="text-[11px] font-semibold border border-gray-200 dark:border-[#2a2b30] rounded-md px-1.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                  >
                    Compress H
                  </button>
                  <button
                    onClick={() => scaleFormation(formationSide, "y", 1.15)}
                    className="text-[11px] font-semibold border border-gray-200 dark:border-[#2a2b30] rounded-md px-1.5 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                  >
                    Expand H
                  </button>
                </div>
                <div className="flex justify-center">
                  <div className="grid grid-cols-3 grid-rows-3 gap-1 w-28">
                    <div />
                    <button
                      onClick={() => nudgeFormation(formationSide, 0, -NUDGE_STEP)}
                      className="border border-gray-200 dark:border-[#2a2b30] rounded-md py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                    >
                      ↑
                    </button>
                    <div />
                    <button
                      onClick={() => nudgeFormation(formationSide, -NUDGE_STEP, 0)}
                      className="border border-gray-200 dark:border-[#2a2b30] rounded-md py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                    >
                      ←
                    </button>
                    <div />
                    <button
                      onClick={() => nudgeFormation(formationSide, NUDGE_STEP, 0)}
                      className="border border-gray-200 dark:border-[#2a2b30] rounded-md py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                    >
                      →
                    </button>
                    <div />
                    <button
                      onClick={() => nudgeFormation(formationSide, 0, NUDGE_STEP)}
                      className="border border-gray-200 dark:border-[#2a2b30] rounded-md py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
                    >
                      ↓
                    </button>
                    <div />
                  </div>
                </div>
              </>
            ) : selectedEl?.type === "player" ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Selection</h3>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold" style={{ color: TEAM_FILL[selectedEl.color] }}>
                    {selectedEl.color === "home" ? teamName : awayTeam || "Away"}
                  </span>
                  <select
                    value={selectedEl.name ?? ""}
                    onChange={(e) => updateElement(selectedEl.id, { name: e.target.value } as Partial<BoardElement>)}
                    className="bg-white dark:bg-[#191a1d] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1.5 text-xs w-full"
                  >
                    <option value="">— Select player —</option>
                    {(selectedEl.color === "home" ? players : awayPlayers)
                      .slice()
                      .sort((a, b) => a.player_name.localeCompare(b.player_name))
                      .map((p) => (
                        <option key={p.player_master_id} value={p.player_name}>
                          {p.player_name}
                        </option>
                      ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Number</span>
                    <input
                      type="number"
                      value={selectedEl.number}
                      onChange={(e) =>
                        updateElement(selectedEl.id, { number: Number(e.target.value) || 0 } as Partial<BoardElement>)
                      }
                      className="w-16 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1 text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => deleteElement(selectedEl.id)}
                    className="mt-1 text-xs font-semibold text-red-500 hover:underline text-left"
                  >
                    Delete player
                  </button>
                </div>
              </>
            ) : selectedEl?.type === "text" ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Selection — Text</h3>
                <div className="flex flex-col gap-3">
                  <input
                    value={selectedEl.text}
                    onChange={(e) => updateElement(selectedEl.id, { text: e.target.value } as Partial<BoardElement>)}
                    className="bg-white dark:bg-[#191a1d] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-2 py-1.5 text-xs w-full"
                    placeholder="Text"
                  />
                  {colorDashWidthControls(false, false)}
                  <button
                    onClick={() => deleteElement(selectedEl.id)}
                    className="text-xs font-semibold text-red-500 hover:underline text-left"
                  >
                    Delete text
                  </button>
                </div>
              </>
            ) : selectedEl ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 capitalize">Selection — {selectedEl.type}</h3>
                <div className="flex flex-col gap-3">
                  {selectedEl.type !== "ball" &&
                    colorDashWidthControls(selectedEl.type === "arrow", selectedEl.type === "arrow" || selectedEl.type === "path")}
                  {selectedEl.type === "arrow" && (selectedEl.fromPlayerId || selectedEl.toPlayerId) && (
                    <button
                      onClick={() => {
                        const ep = arrowEndpoints(selectedEl, elements);
                        updateElement(selectedEl.id, {
                          x1: ep.x1,
                          y1: ep.y1,
                          x2: ep.x2,
                          y2: ep.y2,
                          fromPlayerId: undefined,
                          toPlayerId: undefined,
                        } as Partial<BoardElement>);
                      }}
                      className="text-xs font-semibold text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#26272c] text-left"
                    >
                      Unlink from player(s)
                    </button>
                  )}
                  <button
                    onClick={() => deleteElement(selectedEl.id)}
                    className="text-xs font-semibold text-red-500 hover:underline text-left"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (["arrow", "rect", "circle", "pen", "polydraw", "polyline", "text"] as Tool[]).includes(tool) ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{toolLabel(tool)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Default style for the next one you draw.</p>
                {colorDashWidthControls(tool === "arrow", ["arrow", "pen", "polyline", "polydraw"].includes(tool))}
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{toolLabel(tool)}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click a player, arrow, or zone on the pitch to edit it here.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Saved Boards</h3>
            <button
              onClick={newBoard}
              className="text-xs font-semibold text-blue-600 dark:text-[#ffcf4d] hover:underline"
            >
              + New
            </button>
          </div>
          {loading ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>
          ) : boards.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No saved boards yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {boards.map((b) => (
                <div
                  key={b.id}
                  className={`group flex items-center justify-between gap-1 rounded-md px-2.5 py-2 text-xs cursor-pointer border ${
                    activeBoardId === b.id
                      ? "bg-blue-50 dark:bg-[#ffcf4d]/10 border-blue-200 dark:border-[#7a6a33] text-blue-700 dark:text-[#ffcf4d]"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-[#26272c] text-gray-700 dark:text-gray-200"
                  }`}
                  onClick={() => loadBoard(b)}
                >
                  <span className="truncate font-semibold">{b.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBoard(b.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
                    title="Delete board"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <ToolButton active={tool === "select"} onClick={() => setTool("select")} title="Select / move">
            ↖
          </ToolButton>
          <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} title="Freehand pen">
            ✎
          </ToolButton>
          <ToolButton active={tool === "player-home"} onClick={() => setTool("player-home")} title={`Add ${teamName} player`}>
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: TEAM_FILL.home }}
            >
              H
            </span>
          </ToolButton>
          <ToolButton active={tool === "player-away"} onClick={() => setTool("player-away")} title={`Add ${awayTeam || "away"} player`}>
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: TEAM_FILL.away }}
            >
              A
            </span>
          </ToolButton>
          <ToolButton active={tool === "ball"} onClick={() => setTool("ball")} title="Add ball">
            ⚽
          </ToolButton>
          <ToolButton active={tool === "arrow"} onClick={() => setTool("arrow")} title="Draw arrow (drag from a player to anchor it)">
            ↗
          </ToolButton>
          <ToolButton active={tool === "rect"} onClick={() => setTool("rect")} title="Rectangle zone">
            ▭
          </ToolButton>
          <ToolButton active={tool === "circle"} onClick={() => setTool("circle")} title="Circle zone">
            ○
          </ToolButton>
          <ToolButton active={tool === "polydraw"} onClick={() => setTool("polydraw")} title="Draw polygon — click points, double-click to finish">
            <svg width="16" height="16" viewBox="0 0 14 14">
              <polygon points="7,1 13,5 11,13 3,13 1,5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </ToolButton>
          <ToolButton active={tool === "polyline"} onClick={() => setTool("polyline")} title="Draw polyline — click points, double-click to finish">
            <svg width="16" height="16" viewBox="0 0 14 14">
              <polyline points="1,12 5,4 9,10 13,2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </ToolButton>
          <ToolButton active={tool === "text"} onClick={() => setTool("text")} title="Add text">
            T
          </ToolButton>
          <ToolButton active={tool === "formation"} onClick={() => setTool("formation")} title="Formation">
            👥
          </ToolButton>
          <ToolButton active={tool === "ruler"} onClick={() => setTool("ruler")} title="Measure distance">
            📏
          </ToolButton>

          <div className="w-6 h-px bg-gray-200 dark:bg-[#2a2b30] my-1" />

          <button
            onClick={clearAll}
            title="Clear all elements"
            className="w-9 h-9 shrink-0 rounded-md border flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 border-gray-200 dark:border-[#2a2b30]"
          >
            🗑
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              className="flex-1 min-w-[160px] bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
              placeholder="Board title"
            />
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="text-xs font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-4 py-2 disabled:opacity-50"
            >
              {saving ? "Saving…" : dirty ? "Save" : "Saved"}
            </button>
            <button
              onClick={exportPng}
              className="text-xs font-semibold text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#26272c]"
            >
              Export PNG
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="text-xs font-semibold text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#26272c]"
            >
              {isFullscreen ? "⤢ Exit Fullscreen" : "⛶ Fullscreen"}
            </button>
            <button
              onClick={undo}
              disabled={past.length === 0}
              title="Undo (Ctrl/Cmd+Z)"
              className="text-xs font-semibold text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#26272c] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↺ Undo
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              title="Redo (Ctrl/Cmd+Shift+Z)"
              className="text-xs font-semibold text-gray-700 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#26272c] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↻ Redo
            </button>
          </div>

          {saveError && <p className="text-xs text-red-500 dark:text-red-400 mb-3">⚠ {saveError}</p>}

          <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: TEAM_FILL.home }} /> {teamName}
            </span>
            <span className="text-gray-500 dark:text-gray-400">vs</span>
            <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: TEAM_FILL.away }} /> {awayTeam}
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Pick a tool from the icon column — its settings (color, dashed, width) or the Formation panel show on
            the far left. Click the pitch to place a player/ball, then pick who they are from the roster. Drag to
            draw a pen line, arrow, or zone — drag from a player to anchor an arrow to them. For polygon/polyline,
            click each point then double-click (or Esc to cancel) to finish. Switch to Select and click any element
            to edit or delete it on the left (Delete/Backspace) — Shift+click 3+ players to generate a polygon
            between them.
          </p>

          <div className={`relative w-full mx-auto ${isFullscreen ? "max-w-[1500px]" : "max-w-[900px]"}`}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
              className="w-full rounded-lg border border-gray-200 touch-none select-none"
              style={{ background: PITCH_BG, cursor: tool === "select" ? "default" : "crosshair" }}
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onDoubleClick={handleSvgDoubleClick}
            >
              <PitchMarkings />

              {elements.map((el) => {
                const isSelected = el.id === selectedId;
                if (el.type === "player") {
                  const isMulti = multiSelected.includes(el.id);
                  return (
                    <g
                      key={el.id}
                      onPointerDown={(e) => handlePlayerPointerDown(e, el)}
                      onPointerMove={(e) => handleElPointerMove(e, el)}
                      onPointerUp={handleElPointerUp}
                      style={{ cursor: tool === "select" ? "grab" : tool === "arrow" ? "crosshair" : "default" }}
                    >
                      {isMulti && (
                        <circle cx={el.x} cy={el.y} r={PLAYER_R + 5} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray="3 3" />
                      )}
                      <circle
                        cx={el.x}
                        cy={el.y}
                        r={PLAYER_R}
                        fill={TEAM_FILL[el.color]}
                        stroke={isMulti ? "#22d3ee" : isSelected ? "#ffffff" : "#0e0e10"}
                        strokeWidth={isMulti ? 3 : isSelected ? 3 : 2}
                      />
                      <text x={el.x} y={el.y + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#ffffff">
                        {el.number}
                      </text>
                      {el.name && (
                        <text x={el.x} y={el.y + PLAYER_R + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" stroke="#0e0e10" strokeWidth={3} paintOrder="stroke">
                          {el.name}
                        </text>
                      )}
                    </g>
                  );
                }
                if (el.type === "arrow") {
                  const markerId = `arrow-${el.id}`;
                  const ep = arrowEndpoints(el, elements);
                  const trimmed = trimToMarkerEdges(ep.x1, ep.y1, ep.x2, ep.y2, ep.fromAnchored, ep.toAnchored);
                  const anchored = ep.fromAnchored || ep.toAnchored;
                  return (
                    <g key={el.id}>
                      <defs>
                        <marker id={markerId} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill={el.color} />
                        </marker>
                      </defs>
                      <line
                        x1={trimmed.x1}
                        y1={trimmed.y1}
                        x2={trimmed.x2}
                        y2={trimmed.y2}
                        stroke="transparent"
                        strokeWidth={16}
                        onPointerDown={(e) => handleElPointerDown(e, el)}
                        onPointerMove={(e) => handleElPointerMove(e, el)}
                        onPointerUp={handleElPointerUp}
                        style={{ cursor: tool === "select" ? (anchored ? "pointer" : "grab") : "default" }}
                      />
                      <line
                        x1={trimmed.x1}
                        y1={trimmed.y1}
                        x2={trimmed.x2}
                        y2={trimmed.y2}
                        stroke={el.color}
                        strokeWidth={(el.strokeWidth ?? 3) + (isSelected ? 1 : 0)}
                        strokeDasharray={el.dashed ? "10 6" : undefined}
                        markerEnd={`url(#${markerId})`}
                        pointerEvents="none"
                      />
                    </g>
                  );
                }
                if (el.type === "rect") {
                  return (
                    <rect
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.w}
                      height={el.h}
                      fill={el.color}
                      fillOpacity={0.22}
                      stroke={el.color}
                      strokeWidth={isSelected ? 3 : 2}
                      onPointerDown={(e) => handleElPointerDown(e, el)}
                      onPointerMove={(e) => handleElPointerMove(e, el)}
                      onPointerUp={handleElPointerUp}
                      style={{ cursor: tool === "select" ? "grab" : "default" }}
                    />
                  );
                }
                if (el.type === "circle") {
                  return (
                    <circle
                      key={el.id}
                      cx={el.x}
                      cy={el.y}
                      r={el.w}
                      fill={el.color}
                      fillOpacity={0.22}
                      stroke={el.color}
                      strokeWidth={isSelected ? 3 : 2}
                      onPointerDown={(e) => handleElPointerDown(e, el)}
                      onPointerMove={(e) => handleElPointerMove(e, el)}
                      onPointerUp={handleElPointerUp}
                      style={{ cursor: tool === "select" ? "grab" : "default" }}
                    />
                  );
                }
                if (el.type === "polygon") {
                  const pts = polygonPoints(el, elements);
                  return (
                    <polygon
                      key={el.id}
                      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill={el.color}
                      fillOpacity={0.3}
                      stroke={el.color}
                      strokeWidth={isSelected ? 3 : 2}
                      onPointerDown={(e) => handleElPointerDown(e, el)}
                      style={{ cursor: tool === "select" ? "pointer" : "default" }}
                    />
                  );
                }
                if (el.type === "ball") {
                  return (
                    <g
                      key={el.id}
                      onPointerDown={(e) => handleElPointerDown(e, el)}
                      onPointerMove={(e) => handleElPointerMove(e, el)}
                      onPointerUp={handleElPointerUp}
                      style={{ cursor: tool === "select" ? "grab" : "default" }}
                    >
                      <circle
                        cx={el.x}
                        cy={el.y}
                        r={9}
                        fill="#fafafa"
                        stroke={isSelected ? "#22d3ee" : "#111827"}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                      <text x={el.x} y={el.y + 4} textAnchor="middle" fontSize={11}>
                        ⚽
                      </text>
                    </g>
                  );
                }
                if (el.type === "text") {
                  return (
                    <text
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      fontSize={16}
                      fontWeight={800}
                      fill={el.color}
                      stroke={isSelected ? "#22d3ee" : "none"}
                      strokeWidth={isSelected ? 0.6 : 0}
                      onPointerDown={(e) => handleElPointerDown(e, el)}
                      onPointerMove={(e) => handleElPointerMove(e, el)}
                      onPointerUp={handleElPointerUp}
                      style={{ cursor: tool === "select" ? "grab" : "default", userSelect: "none" }}
                    >
                      {el.text}
                    </text>
                  );
                }
                if (el.type !== "path") return null;
                const pathAttr = el.points.map((p) => `${p.x},${p.y}`).join(" ");
                return el.closed ? (
                  <polygon
                    key={el.id}
                    points={pathAttr}
                    fill={el.color}
                    fillOpacity={0.28}
                    stroke={el.color}
                    strokeWidth={(el.strokeWidth ?? 2) + (isSelected ? 1 : 0)}
                    onPointerDown={(e) => handleElPointerDown(e, el)}
                    onPointerMove={(e) => handleElPointerMove(e, el)}
                    onPointerUp={handleElPointerUp}
                    style={{ cursor: tool === "select" ? "grab" : "default" }}
                  />
                ) : (
                  <polyline
                    key={el.id}
                    points={pathAttr}
                    fill="none"
                    stroke={el.color}
                    strokeWidth={(el.strokeWidth ?? 3) + (isSelected ? 1 : 0)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onPointerDown={(e) => handleElPointerDown(e, el)}
                    onPointerMove={(e) => handleElPointerMove(e, el)}
                    onPointerUp={handleElPointerUp}
                    style={{ cursor: tool === "select" ? "grab" : "default" }}
                  />
                );
              })}

              {draft &&
                (draft.type === "arrow" ? (
                  <line x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke={currentColor} strokeWidth={currentWidth} strokeDasharray={dashed ? "10 6" : undefined} opacity={0.7} />
                ) : draft.type === "rect" ? (
                  <rect
                    x={Math.min(draft.x1, draft.x2)}
                    y={Math.min(draft.y1, draft.y2)}
                    width={Math.abs(draft.x2 - draft.x1)}
                    height={Math.abs(draft.y2 - draft.y1)}
                    fill={currentColor}
                    fillOpacity={0.15}
                    stroke={currentColor}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                ) : (
                  <circle
                    cx={draft.x1}
                    cy={draft.y1}
                    r={Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1)}
                    fill={currentColor}
                    fillOpacity={0.15}
                    stroke={currentColor}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                ))}

              {pathDraft && pathDraft.length > 0 && (
                <>
                  <polyline
                    points={[...pathDraft, ...(cursorPt && (tool === "polyline" || tool === "polydraw") ? [cursorPt] : [])]
                      .map((p) => `${p.x},${p.y}`)
                      .join(" ")}
                    fill="none"
                    stroke={currentColor}
                    strokeWidth={currentWidth}
                    strokeDasharray="4 3"
                    opacity={0.8}
                  />
                  {(tool === "polyline" || tool === "polydraw") &&
                    pathDraft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={currentColor} />)}
                </>
              )}

              {ruler &&
                (() => {
                  const distM = Math.hypot(ruler.x2 - ruler.x1, ruler.y2 - ruler.y1) / SCALE;
                  const mx = (ruler.x1 + ruler.x2) / 2;
                  const my = (ruler.y1 + ruler.y2) / 2;
                  return (
                    <g pointerEvents="none">
                      <line x1={ruler.x1} y1={ruler.y1} x2={ruler.x2} y2={ruler.y2} stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 4" />
                      <circle cx={ruler.x1} cy={ruler.y1} r={3} fill="#fbbf24" />
                      <circle cx={ruler.x2} cy={ruler.y2} r={3} fill="#fbbf24" />
                      <rect x={mx - 28} y={my - 11} width={56} height={20} rx={4} fill="#0e0e10" opacity={0.85} />
                      <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fbbf24">
                        {distM.toFixed(1)}m
                      </text>
                    </g>
                  );
                })()}
            </svg>

            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-full px-3.5 py-1.5">
              <span className="text-xs font-bold text-white">{teamName}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
