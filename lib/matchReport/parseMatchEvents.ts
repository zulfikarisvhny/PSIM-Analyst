// lib/matchReport/parseMatchEvents.ts
// Parses cards and substitutions from the "Starting lineup" / "Substitutes"
// page (both teams' lineups sit side by side, split by x < pageWidth/2 like
// every other page in this parser). Each lineup row can carry 0-2 small
// minute markers (e.g. "68'") whose icon type (card color / sub arrow
// direction) is only recoverable via resolveIconColors's color classification
// — the plain text alone can't distinguish a card from a substitution.
// Substitution pairs (who replaced whom) are matched by same team + same
// position code + same minute between a "Starting lineup" sub-out marker and
// a "Substitutes" sub-in marker.
import { groupRows, type TextItem } from "../pdf/textLayout";
import { classifyMarkerIcon, type IconFill } from "./resolveIconColors";

export interface MatchEvent {
  type: "goal" | "yellow_card" | "red_card" | "substitution";
  minute: string; // e.g. "68" or "90+3" (no trailing apostrophe)
  player: string; // scorer / carded player / player going off
  subInPlayer?: string; // substitution only — player coming on
}

const POSITION_CODE_RE = /^[A-Z]{2,6}$/;
const MINUTE_MARKER_RE = /^(\d+(?:\+\d+)?)'$/;

export interface StartingPlayer {
  jersey: number;
  position: string;
  name: string;
}

interface LineupRow {
  position: string;
  side: "home" | "away";
  jersey: number;
  name: string;
  markers: { minute: string; x: number; y: number }[];
}

function findHeaderY(items: TextItem[], label: string): number | null {
  return items.find((it) => it.str === label)?.y ?? null;
}

/** Splits each visual row (which spans both teams' side-by-side columns) into a home half and an away half, then extracts position/name/markers from each half. */
function parseLineupRows(items: TextItem[], pageWidth: number, yMin: number, yMax: number): LineupRow[] {
  const mid = pageWidth / 2;
  const rows = groupRows(items.filter((it) => it.y > yMin && it.y < yMax));
  const out: LineupRow[] = [];

  for (const row of rows) {
    for (const side of ["home", "away"] as const) {
      const half = row.filter((it) => (side === "home" ? it.x < mid : it.x >= mid));
      if (half.length === 0) continue;
      const posItem = half[0];
      if (!POSITION_CODE_RE.test(posItem.str)) continue;
      const jerseyItem = half.find((it) => it !== posItem && /^\d+$/.test(it.str));
      if (!jerseyItem) continue;
      const nameItem = half.find((it) => it !== posItem && it !== jerseyItem && !MINUTE_MARKER_RE.test(it.str));
      if (!nameItem) continue;
      const markers = half
        .filter((it) => MINUTE_MARKER_RE.test(it.str))
        .map((it) => ({ minute: it.str.replace(/'$/, ""), x: it.x, y: it.y }));
      out.push({ position: posItem.str, side, jersey: Number(jerseyItem.str), name: nameItem.str, markers });
    }
  }
  return out;
}

/** The 11 starting players per side (jersey, lineup position code, name) — used for the pitch/formation view. Bench and unused substitutes aren't included. */
export function parseStartingLineups(items: TextItem[], pageWidth: number): { home: StartingPlayer[]; away: StartingPlayer[] } {
  const startY = findHeaderY(items, "Starting lineup");
  const subsY = findHeaderY(items, "Substitutes");
  if (startY === null || subsY === null) return { home: [], away: [] };

  const rows = parseLineupRows(items, pageWidth, subsY, startY);
  return {
    home: rows.filter((r) => r.side === "home").map((r) => ({ jersey: r.jersey, position: r.position, name: r.name })),
    away: rows.filter((r) => r.side === "away").map((r) => ({ jersey: r.jersey, position: r.position, name: r.name })),
  };
}

const JERSEY_ONLY_RE = /^\d{1,3}$/;

/**
 * The "Bench" section (printed below "Substitutes") lists truly-unused
 * reserves as just a jersey number + name — no position code, unlike every
 * other lineup row. parseLineupRows requires a position code as the row's
 * first item, so it silently drops this section entirely; this is the same
 * row/side-splitting idea but for the position-less format.
 */
function parseBenchOnlyRows(items: TextItem[], pageWidth: number, yMin: number, yMax: number): LineupRow[] {
  const mid = pageWidth / 2;
  const rows = groupRows(items.filter((it) => it.y > yMin && it.y < yMax));
  const out: LineupRow[] = [];

  for (const row of rows) {
    for (const side of ["home", "away"] as const) {
      const half = row.filter((it) => (side === "home" ? it.x < mid : it.x >= mid));
      if (half.length === 0) continue;
      const jerseyItem = half.find((it) => JERSEY_ONLY_RE.test(it.str));
      if (!jerseyItem) continue;
      const nameItem = half.find((it) => it !== jerseyItem);
      if (!nameItem) continue;
      out.push({ position: "", side, jersey: Number(jerseyItem.str), name: nameItem.str, markers: [] });
    }
  }
  return out;
}

/** Every bench player per side (jersey, position code, name) — both the "Substitutes" (used, with position code) and "Bench" (unused, no position code) rows, whether or not they actually came on. */
export function parseBenchPlayers(items: TextItem[], pageWidth: number): { home: StartingPlayer[]; away: StartingPlayer[] } {
  const subsY = findHeaderY(items, "Substitutes");
  const benchY = findHeaderY(items, "Bench");
  if (subsY === null || benchY === null) return { home: [], away: [] };

  const usedSubs = parseLineupRows(items, pageWidth, benchY, subsY);
  const unusedBench = parseBenchOnlyRows(items, pageWidth, 0, benchY);
  const rows = [...usedSubs, ...unusedBench];

  return {
    home: rows.filter((r) => r.side === "home").map((r) => ({ jersey: r.jersey, position: r.position, name: r.name })),
    away: rows.filter((r) => r.side === "away").map((r) => ({ jersey: r.jersey, position: r.position, name: r.name })),
  };
}

export function parseMatchEvents(items: TextItem[], pageWidth: number, fills: IconFill[]): { home: MatchEvent[]; away: MatchEvent[] } {
  const startY = findHeaderY(items, "Starting lineup");
  const subsY = findHeaderY(items, "Substitutes");
  const benchY = findHeaderY(items, "Bench");
  if (startY === null || subsY === null) return { home: [], away: [] };

  const startingRows = parseLineupRows(items, pageWidth, subsY, startY);
  const subsRows = benchY !== null ? parseLineupRows(items, pageWidth, benchY, subsY) : [];

  const cardEvents: { side: "home" | "away"; type: "yellow_card" | "red_card"; minute: string; player: string }[] = [];
  const subOutCandidates: { side: "home" | "away"; position: string; minute: string; player: string }[] = [];
  for (const row of startingRows) {
    for (const marker of row.markers) {
      const kind = classifyMarkerIcon(marker.x, marker.y, fills);
      if (kind === "yellow_card" || kind === "red_card") {
        cardEvents.push({ side: row.side, type: kind, minute: marker.minute, player: row.name });
      } else if (kind === "sub_out") {
        subOutCandidates.push({ side: row.side, position: row.position, minute: marker.minute, player: row.name });
      }
      // "goal" markers are skipped here — the cover page is the source of truth for goals.
    }
  }

  const subInCandidates: { side: "home" | "away"; position: string; minute: string; player: string }[] = [];
  for (const row of subsRows) {
    for (const marker of row.markers) {
      if (classifyMarkerIcon(marker.x, marker.y, fills) === "sub_in") {
        subInCandidates.push({ side: row.side, position: row.position, minute: marker.minute, player: row.name });
      }
    }
  }

  const subEvents: { side: "home" | "away"; minute: string; playerOut: string; playerIn: string | null }[] = [];
  const usedIn = new Set<number>();
  const unpaired: (typeof subOutCandidates)[number][] = [];
  // Pass 1: pair by same side + position code + minute (the normal case).
  for (const out of subOutCandidates) {
    const inIdx = subInCandidates.findIndex(
      (inCand, idx) => !usedIn.has(idx) && inCand.side === out.side && inCand.position === out.position && inCand.minute === out.minute
    );
    if (inIdx >= 0) {
      usedIn.add(inIdx);
      subEvents.push({ side: out.side, minute: out.minute, playerOut: out.player, playerIn: subInCandidates[inIdx].player });
    } else {
      unpaired.push(out);
    }
  }
  // Pass 2: fall back to same side + minute only, ignoring position code — a
  // tactical reshuffle can list the incoming sub under a different slot (e.g.
  // LDMF replaced by someone logged as RDMF). Better to show a plausible pair
  // than leave a confirmed substitution with no incoming name at all.
  for (const out of unpaired) {
    const inIdx = subInCandidates.findIndex((inCand, idx) => !usedIn.has(idx) && inCand.side === out.side && inCand.minute === out.minute);
    if (inIdx >= 0) {
      usedIn.add(inIdx);
      subEvents.push({ side: out.side, minute: out.minute, playerOut: out.player, playerIn: subInCandidates[inIdx].player });
    } else {
      subEvents.push({ side: out.side, minute: out.minute, playerOut: out.player, playerIn: null });
    }
  }

  function eventsFor(side: "home" | "away"): MatchEvent[] {
    const events: MatchEvent[] = [];
    for (const c of cardEvents) if (c.side === side) events.push({ type: c.type, minute: c.minute, player: c.player });
    for (const s of subEvents)
      if (s.side === side) events.push({ type: "substitution", minute: s.minute, player: s.playerOut, subInPlayer: s.playerIn ?? undefined });
    return events;
  }

  return { home: eventsFor("home"), away: eventsFor("away") };
}
