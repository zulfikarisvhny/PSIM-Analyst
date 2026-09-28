// lib/teamStyle/insertTeamStyleStats.ts
// Server-only. Upserts a club by name, then upserts its team_style_stats row
// on (club_id, season, matches_played) — same conflict key as
// extract-PDF/extract_team_style_stats.py, so re-importing at the same
// matches_played count updates instead of duplicating, while a new
// matches_played count adds a fresh snapshot row (intentional history).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamStyleResult } from "./parseTeamStyleXlsx";

const SEASON = "2026/2027";

export async function insertTeamStyleStats(result: TeamStyleResult, supabase: SupabaseClient) {
  const { teamName, metrics } = result;

  const { error: upsertErr } = await supabase.from("clubs").upsert({ name: teamName }, { onConflict: "name" });
  if (upsertErr) throw new Error(`clubs upsert failed: ${upsertErr.message}`);

  const { data: clubRow, error: clubErr } = await supabase.from("clubs").select("id").eq("name", teamName).single();
  if (clubErr || !clubRow) throw new Error(`clubs lookup failed: ${clubErr?.message ?? "not found"}`);

  const row = {
    club_id: clubRow.id,
    season: SEASON,
    as_of: new Date().toISOString().slice(0, 10),
    matches_played: metrics.matchesPlayed,
    wins: metrics.wins,
    draws: metrics.draws,
    losses: metrics.losses,
    possession_pct: metrics.possessionPct,
    direct_pct: metrics.directPct,
    pass_accuracy_pct: metrics.passAccuracyPct,
    xg_per_shot: metrics.xgPerShot,
    proactive_def_pct: metrics.proactiveDefPct,
    step_out_pct: metrics.stepOutPct,
    aerial_pct: metrics.aerialPct,
  };

  const { error } = await supabase.from("team_style_stats").upsert(row, { onConflict: "club_id,season,matches_played" });
  if (error) throw new Error(`team_style_stats upsert failed for ${teamName}: ${error.message}`);

  return { teamName, matchesPlayed: metrics.matchesPlayed };
}
