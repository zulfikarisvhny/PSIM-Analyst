// lib/physicalStats/insertPhysicalStats.ts
// Server-only. Writes to player_physical_stats using its current schema:
// player_id + match_id (both FKs, both nullable), session_date, session_type,
// drill, total_distance_m, high_speed_running_m, sprint_distance_m,
// sprint_count, top_speed_kmh, accelerations, decelerations, player_load,
// minutes_played, notes. There's no player_name_raw/club_id/total_jumps/
// running_imbalance column, so the raw Catapult name + jumps + imbalance
// (still useful, just unmodeled) go into `notes` instead of being silently
// dropped. sprint_count isn't present anywhere in this report, so it's
// always null; player_load is only present in per-drill rows (null for the
// Team Summary row, same as the PDF itself).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatapultSessionMeta, CatapultPlayerRow } from "./parseCatapultReport";

export interface PlayerRowWithMatch extends CatapultPlayerRow {
  playerId: number | null;
}

function buildNotes(p: CatapultPlayerRow): string {
  const parts = [`Catapult: ${p.playerNameRaw}`];
  if (p.totalJumps !== null) parts.push(`Jumps: ${p.totalJumps}`);
  if (p.runningImbalancePct !== null) parts.push(`Imbalance: ${p.runningImbalancePct}% ${p.runningImbalanceSide ?? ""}`.trim());
  return parts.join(" | ");
}

export async function insertPhysicalStats(
  data: { meta: CatapultSessionMeta; players: PlayerRowWithMatch[]; matchId?: number | null },
  supabase: SupabaseClient
) {
  const { meta, players, matchId = null } = data;
  const { clubName, sessionDateIso, sessionType } = meta;
  if (!clubName) throw new Error("Could not read the club/team name from this PDF");
  if (!sessionDateIso) throw new Error("Could not read the session date from this PDF");
  if (players.length === 0) throw new Error("No player rows to import");

  const { error: upsertErr } = await supabase.from("clubs").upsert({ name: clubName }, { onConflict: "name" });
  if (upsertErr) throw new Error(`clubs upsert failed: ${upsertErr.message}`);

  const { data: clubRow, error: clubErr } = await supabase.from("clubs").select("id").eq("name", clubName).single();
  if (clubErr || !clubRow) throw new Error(`clubs lookup failed: ${clubErr?.message ?? "not found"}`);

  // matchId is resolved client-side (see /api/physical-stats/preview's
  // suggestedMatchId + the browser's match-link dropdown) so the user can
  // confirm/override it, rather than guessed silently here.

  // Re-running the same session for a player (identified by player_id) should
  // update, not duplicate — but only for rows we can identify that way; a
  // fresh player_id=null row from re-uploading is just inserted again.
  const matchedPlayerIds = players.map((p) => p.playerId).filter((id): id is number => id !== null);
  if (matchedPlayerIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from("player_physical_stats")
      .delete()
      .eq("session_date", sessionDateIso)
      .eq("session_type", sessionType)
      .in("player_id", matchedPlayerIds);
    if (deleteErr) throw new Error(`player_physical_stats delete failed: ${deleteErr.message}`);
  }

  const rows = players.map((p) => ({
    player_id: p.playerId,
    match_id: matchId,
    session_date: sessionDateIso,
    session_type: sessionType,
    drill: p.drill,
    total_distance_m: p.totalDistanceM,
    high_speed_running_m: p.hsDistanceM,
    sprint_distance_m: p.sprintDistanceM,
    sprint_count: null,
    top_speed_kmh: p.maxVelocityKmh,
    accelerations: p.accelerations,
    decelerations: p.decelerations,
    player_load: p.playerLoad,
    minutes_played: p.durationSeconds !== null ? Math.round((p.durationSeconds / 60) * 10) / 10 : null,
    notes: buildNotes(p),
  }));

  const { error: insertErr } = await supabase.from("player_physical_stats").insert(rows);
  if (insertErr) throw new Error(`player_physical_stats insert failed: ${insertErr.message}`);

  const unmatchedCount = players.length - matchedPlayerIds.length;
  return { clubName, sessionDateIso, sessionType, playerCount: rows.length, unmatchedCount };
}
