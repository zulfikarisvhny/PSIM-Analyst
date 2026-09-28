// lib/scouting/tacticsBoards.ts
import { createClient } from "@supabase/supabase-js";

// persistSession/autoRefreshToken disabled for the same reason as
// formationLineups.ts — avoids a stray "authenticated" session (from the
// separate admin/ app sharing this Supabase project) silently blocking
// writes under RLS.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const TABLE = "tactics_boards";

export type BoardTeamColor = "home" | "away";

export interface PlayerElement {
  id: string;
  type: "player";
  x: number;
  y: number;
  number: number;
  color: BoardTeamColor;
  name?: string;
}

export interface ArrowElement {
  id: string;
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
  color: string;
  strokeWidth?: number;
  // When set, this endpoint tracks that player marker's live position instead
  // of the stored x1/y1 (or x2/y2) — the line follows when the player is
  // dragged. "Unlink" clears these back to a fixed free-floating endpoint.
  fromPlayerId?: string;
  toPlayerId?: string;
}

export interface ShapeElement {
  id: string;
  type: "rect" | "circle";
  x: number; // rect: top-left corner. circle: center.
  y: number;
  w: number; // rect: width. circle: radius (h unused).
  h: number;
  color: string;
}

export interface PolygonElement {
  id: string;
  type: "polygon";
  // Each vertex tracks its player's live position when playerId is set
  // (x/y kept only as a fallback for a since-deleted player), same idea as
  // ArrowElement's anchored endpoints.
  points: { x: number; y: number; playerId?: string }[];
  color: string;
}

export interface BallElement {
  id: string;
  type: "ball";
  x: number;
  y: number;
}

export interface TextElement {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface PathElement {
  id: string;
  type: "path";
  // Fixed (not player-anchored) vertices — manually drawn with the pen or
  // polyline/polygon click-tools. closed=true renders/fills as a polygon.
  points: { x: number; y: number }[];
  closed: boolean;
  color: string;
  strokeWidth?: number;
}

export type BoardElement = PlayerElement | ArrowElement | ShapeElement | PolygonElement | BallElement | TextElement | PathElement;

export interface TacticsBoardRow {
  id: string;
  team: string;
  title: string;
  elements: BoardElement[];
  updated_at: string;
}

export interface SaveResult {
  ok: boolean;
  message?: string;
}

/** All saved boards for a team, most recently updated first. */
export async function fetchBoards(team: string): Promise<TacticsBoardRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, team, title, elements, updated_at")
    .eq("team", team)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data as TacticsBoardRow[];
}

export async function createBoard(
  team: string,
  title: string,
  elements: BoardElement[]
): Promise<SaveResult & { id?: string }> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ team, title, elements })
      .select("id")
      .single();
    if (error) {
      console.error("[tactics_boards] insert failed:", error);
      return { ok: false, message: `${error.message}${error.code ? ` (${error.code})` : ""}` };
    }
    return { ok: true, id: (data as { id: string }).id };
  } catch (err) {
    console.error("[tactics_boards] threw:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Request failed (network/browser)." };
  }
}

export async function updateBoard(id: string, title: string, elements: BoardElement[]): Promise<SaveResult> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ title, elements, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[tactics_boards] update failed:", error);
      return { ok: false, message: `${error.message}${error.code ? ` (${error.code})` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[tactics_boards] threw:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Request failed (network/browser)." };
  }
}

export async function deleteBoard(id: string): Promise<SaveResult> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      console.error("[tactics_boards] delete failed:", error);
      return { ok: false, message: `${error.message}${error.code ? ` (${error.code})` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[tactics_boards] threw:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Request failed (network/browser)." };
  }
}
