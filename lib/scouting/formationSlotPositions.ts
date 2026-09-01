// lib/scouting/formationSlotPositions.ts
import { createClient } from "@supabase/supabase-js";

// See formationLineups.ts for why persistSession/autoRefreshToken are off.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const TABLE = "formation_slot_positions";

export interface SlotPositionRow {
  formation: string;
  slot_key: string;
  x: number;
  y: number;
}

export interface SaveResult {
  ok: boolean;
  message?: string;
}

/** All custom (drag-adjusted) slot positions for a team, across every formation. */
export async function fetchSlotPositions(team: string): Promise<SlotPositionRow[]> {
  const { data, error } = await supabase.from(TABLE).select("formation, slot_key, x, y").eq("team", team);
  if (error || !data) return [];
  return data as SlotPositionRow[];
}

/** Overwrite every slot position for one team/formation in a single batch upsert. */
export async function saveSlotPositions(
  team: string,
  formation: string,
  positions: Record<string, { x: number; y: number }>
): Promise<SaveResult> {
  const rows = Object.entries(positions).map(([slotKey, pos]) => ({
    team,
    formation,
    slot_key: slotKey,
    x: pos.x,
    y: pos.y,
  }));
  if (rows.length === 0) return { ok: true };
  try {
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "team,formation,slot_key" });
    if (error) {
      console.error("[formation_slot_positions] upsert failed:", error);
      return { ok: false, message: `${error.message}${error.code ? ` (${error.code})` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[formation_slot_positions] upsert threw:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Request failed (network/browser)." };
  }
}
