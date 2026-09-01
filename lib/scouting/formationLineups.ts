// lib/scouting/formationLineups.ts
import { createClient } from "@supabase/supabase-js";

// persistSession/autoRefreshToken disabled: this runs in the browser, and
// without it a stale/expired Supabase auth session in localStorage (e.g.
// from the separate admin/ app, which shares this project) gets picked up
// automatically and used instead of the anon key — resolving to the
// "authenticated" role, which has no policies on this table, causing a
// silent-looking RLS rejection ("new row violates row-level security policy").
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const TABLE = "formation_lineups";

export interface LineupRow {
  formation: string;
  slot_key: string;
  depth: 1 | 2 | 3;
  player_id: string;
  player_name: string;
}

export interface SaveResult {
  ok: boolean;
  message?: string;
}

/** All saved lineup slots for a team, across every formation. */
export async function fetchLineups(team: string): Promise<LineupRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("formation, slot_key, depth, player_id, player_name")
    .eq("team", team);
  if (error || !data) return [];
  return data as LineupRow[];
}

/** Assign (or clear, if playerId is "") one depth slot for one team/formation/position. */
export async function saveLineupSlot(params: {
  team: string;
  formation: string;
  slotKey: string;
  depth: 1 | 2 | 3;
  playerId: string;
  playerName: string;
}): Promise<SaveResult> {
  const { team, formation, slotKey, depth, playerId, playerName } = params;

  try {
    if (!playerId) {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("team", team)
        .eq("formation", formation)
        .eq("slot_key", slotKey)
        .eq("depth", depth);
      if (error) {
        console.error("[formation_lineups] delete failed:", error);
        return { ok: false, message: `${error.message}${error.code ? ` (${error.code})` : ""}` };
      }
      return { ok: true };
    }

    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { team, formation, slot_key: slotKey, depth, player_id: playerId, player_name: playerName },
        { onConflict: "team,formation,slot_key,depth" }
      );
    if (error) {
      console.error("[formation_lineups] upsert failed:", error);
      return { ok: false, message: `${error.message}${error.code ? ` (${error.code})` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[formation_lineups] threw:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Request failed (network/browser)." };
  }
}
