// lib/matchReport/insertMatchReport.ts
// Server-only. Upserts clubs, finds-or-inserts the match, upserts both sides'
// team_match_stats. Safe to re-run (mirrors extract-PDF/extract_match_report.py's
// insert_to_db, using the same on_conflict keys).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedMatchReport } from "./parseMatchReport";
import type { MatchEvent, StartingPlayer } from "./parseMatchEvents";
import type { TimeSegmentMetric } from "./parseTimeSegments";
import type { TeamPassSummary } from "./parsePassCombinations";
import { matchPlayerName, type PlayerOption } from "../physicalStats/matchPlayerName";

function parseNumber(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Maps our parser's metric slugs onto the existing match_time_segments table's
// columns (one row per match+club+segment, metrics as columns — not the
// long/per-metric shape the parser produces internally).
const TIME_SEGMENT_COLUMNS: Record<string, string> = {
  ball_possession: "possession_pct",
  pass_accuracy: "pass_accuracy_pct",
  long_pass_share: "long_pass_share_pct",
  duels_win_rate: "duels_win_pct",
  attacks_per_minute: "attacks_per_min",
  recoveries_per_minute: "recoveries_per_min",
  average_formation_line_m: "avg_formation_line_m",
  pressing_intensity_ppda: "ppda",
};
// The table's own segment labels ("0-15", not the PDF's "1-15"), in the same
// chronological order as TimeSegmentMetric.buckets.
const DB_SEGMENT_LABELS = ["0-15", "16-30", "31-45+", "46-60", "61-75", "76-90+"];

function buildTimeSegmentRows(matchId: string, clubId: string, metrics: TimeSegmentMetric[]) {
  return DB_SEGMENT_LABELS.map((segment, i) => {
    const row: Record<string, unknown> = { match_id: matchId, club_id: clubId, segment };
    for (const m of metrics) {
      const column = TIME_SEGMENT_COLUMNS[m.metric];
      if (column) row[column] = m.buckets?.[i] ?? null;
    }
    return row;
  });
}

/**
 * Resolves each side's pass-combination grid against the `players` table.
 * jersey_number isn't populated on that table yet, so this matches by name
 * instead (same matchPlayerName heuristic the Physical Stats import uses —
 * exact / surname / fuzzy), keyed by each row's jersey number so combination
 * cells (which only carry jersey numbers) can look the player back up. A
 * player matchPlayerName can't confidently resolve is skipped rather than
 * guessed — counted in the return value so the caller can surface it.
 */
async function insertPassCombinations(
  supabase: SupabaseClient,
  matchId: string,
  sides: { clubId: string; summary: TeamPassSummary }[]
): Promise<{ combinationsInserted: number; playersSkipped: number }> {
  const { error: delCombosErr } = await supabase.from("match_pass_combinations").delete().eq("match_id", matchId);
  if (delCombosErr) throw new Error(`match_pass_combinations delete failed: ${delCombosErr.message}`);
  const { error: delSummaryErr } = await supabase.from("match_passing_summary").delete().eq("match_id", matchId);
  if (delSummaryErr) throw new Error(`match_passing_summary delete failed: ${delSummaryErr.message}`);

  const combinationRows: Record<string, unknown>[] = [];
  const summaryRows: Record<string, unknown>[] = [];
  let playersSkipped = 0;

  for (const { clubId, summary } of sides) {
    const { data: roster, error: rosterErr } = await supabase.from("players").select("id, name").eq("club_id", clubId);
    if (rosterErr) throw new Error(`players lookup failed for club ${clubId}: ${rosterErr.message}`);
    const rosterOptions: PlayerOption[] = (roster ?? []).map((p: { id: string; name: string }) => ({ id: Number(p.id), name: p.name }));

    const playerIdByJersey = new Map<number, string>();
    for (const player of summary.players) {
      const match = matchPlayerName(player.name, rosterOptions);
      if (match.playerId === null) {
        playersSkipped++;
        continue;
      }
      playerIdByJersey.set(player.jersey, String(match.playerId));
    }

    for (const player of summary.players) {
      const playerId = playerIdByJersey.get(player.jersey);
      if (!playerId) continue; // already counted above
      summaryRows.push({
        match_id: matchId,
        player_id: playerId,
        total_passes: player.totalPasses,
        def_third_pct: summary.thirds?.def ?? null,
        mid_third_pct: summary.thirds?.mid ?? null,
        final_third_pct: summary.thirds?.final ?? null,
      });
    }

    for (const combo of summary.combinations) {
      const fromId = playerIdByJersey.get(combo.fromJersey);
      const toId = playerIdByJersey.get(combo.toJersey);
      if (!fromId || !toId) continue; // already counted via the player-total pass above
      combinationRows.push({ match_id: matchId, from_player_id: fromId, to_player_id: toId, pass_count: combo.passCount });
    }
  }

  if (combinationRows.length > 0) {
    const { error } = await supabase.from("match_pass_combinations").insert(combinationRows);
    if (error) throw new Error(`match_pass_combinations insert failed: ${error.message}`);
  }
  if (summaryRows.length > 0) {
    const { error } = await supabase.from("match_passing_summary").insert(summaryRows);
    if (error) throw new Error(`match_passing_summary insert failed: ${error.message}`);
  }

  return { combinationsInserted: combinationRows.length, playersSkipped };
}

/**
 * Resolves each event's player name(s) against that side's roster (same
 * matchPlayerName heuristic as pass combinations). player_id is left null
 * when it can't be confidently resolved — the raw parsed name is stored
 * either way so the event still displays.
 */
async function insertMatchEvents(
  supabase: SupabaseClient,
  matchId: string,
  sides: { clubId: string; events: MatchEvent[] }[]
): Promise<number> {
  const { error: delErr } = await supabase.from("match_events").delete().eq("match_id", matchId);
  if (delErr) throw new Error(`match_events delete failed: ${delErr.message}`);

  const rows: Record<string, unknown>[] = [];
  for (const { clubId, events } of sides) {
    if (events.length === 0) continue;
    const { data: roster, error: rosterErr } = await supabase.from("players").select("id, name").eq("club_id", clubId);
    if (rosterErr) throw new Error(`players lookup failed for club ${clubId}: ${rosterErr.message}`);
    const rosterOptions: PlayerOption[] = (roster ?? []).map((p: { id: string; name: string }) => ({ id: Number(p.id), name: p.name }));

    for (const event of events) {
      const match = matchPlayerName(event.player, rosterOptions);
      const subInMatch = event.subInPlayer ? matchPlayerName(event.subInPlayer, rosterOptions) : null;
      rows.push({
        match_id: matchId,
        club_id: clubId,
        event_type: event.type,
        minute: event.minute,
        player_id: match.playerId !== null ? String(match.playerId) : null,
        player_name_raw: event.player,
        sub_in_player_id: subInMatch && subInMatch.playerId !== null ? String(subInMatch.playerId) : null,
        sub_in_player_name_raw: event.subInPlayer ?? null,
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("match_events").insert(rows);
    if (error) throw new Error(`match_events insert failed: ${error.message}`);
  }
  return rows.length;
}

/** Resolves each starting player's name against that side's roster and inserts one row per player, for the pitch/formation view. */
async function insertStartingLineups(
  supabase: SupabaseClient,
  matchId: string,
  sides: { clubId: string; players: StartingPlayer[] }[]
): Promise<number> {
  const { error: delErr } = await supabase.from("match_lineups").delete().eq("match_id", matchId);
  if (delErr) throw new Error(`match_lineups delete failed: ${delErr.message}`);

  const rows: Record<string, unknown>[] = [];
  for (const { clubId, players } of sides) {
    if (players.length === 0) continue;
    const { data: roster, error: rosterErr } = await supabase.from("players").select("id, name").eq("club_id", clubId);
    if (rosterErr) throw new Error(`players lookup failed for club ${clubId}: ${rosterErr.message}`);
    const rosterOptions: PlayerOption[] = (roster ?? []).map((p: { id: string; name: string }) => ({ id: Number(p.id), name: p.name }));

    for (const player of players) {
      const match = matchPlayerName(player.name, rosterOptions);
      rows.push({
        match_id: matchId,
        club_id: clubId,
        player_id: match.playerId !== null ? String(match.playerId) : null,
        player_name_raw: player.name,
        jersey_number: player.jersey,
        position_code: player.position,
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("match_lineups").insert(rows);
    if (error) throw new Error(`match_lineups insert failed: ${error.message}`);
  }
  return rows.length;
}

export async function insertMatchReport(data: ExtractedMatchReport, supabase: SupabaseClient) {
  const { meta } = data;
  const { homeTeam, awayTeam, matchDateIso } = meta;
  if (!homeTeam || !awayTeam) {
    throw new Error(`Could not read team names from this PDF (home=${homeTeam}, away=${awayTeam})`);
  }

  for (const name of [homeTeam, awayTeam]) {
    const { error } = await supabase.from("clubs").upsert({ name }, { onConflict: "name" });
    if (error) throw new Error(`clubs upsert failed: ${error.message}`);
  }

  const { data: clubRows, error: clubErr } = await supabase.from("clubs").select("id, name").in("name", [homeTeam, awayTeam]);
  if (clubErr) throw new Error(`clubs lookup failed: ${clubErr.message}`);
  const clubIdByName = new Map((clubRows ?? []).map((c: { id: string; name: string }) => [c.name, c.id]));
  const homeId = clubIdByName.get(homeTeam);
  const awayId = clubIdByName.get(awayTeam);
  if (!homeId || !awayId) throw new Error(`Could not resolve club ids for ${homeTeam} / ${awayTeam}`);

  const { data: existing, error: existingErr } = await supabase
    .from("matches")
    .select("id")
    .eq("home_club_id", homeId)
    .eq("away_club_id", awayId)
    .eq("match_date", matchDateIso);
  if (existingErr) throw new Error(`matches lookup failed: ${existingErr.message}`);

  const matchRow = {
    home_club_id: homeId,
    away_club_id: awayId,
    match_date: matchDateIso,
    competition: meta.competition,
    round: meta.round,
    home_score: meta.homeScore,
    away_score: meta.awayScore,
  };

  let matchId: string;
  let matchStatus: string;
  if (existing && existing.length > 0) {
    matchId = existing[0].id;
    const { error } = await supabase.from("matches").update(matchRow).eq("id", matchId);
    if (error) throw new Error(`matches update failed: ${error.message}`);
    matchStatus = "updated existing row";
  } else {
    const { data: inserted, error } = await supabase.from("matches").insert(matchRow).select("id");
    if (error) throw new Error(`matches insert failed: ${error.message}`);
    matchId = inserted![0].id;
    matchStatus = "inserted new row";
  }

  const matchLabel = `${homeTeam} vs ${awayTeam}`;
  const sides: [string, Record<string, string>, string | null][] = [
    [homeTeam, data.teamStatsHome, data.homeScheme],
    [awayTeam, data.teamStatsAway, data.awayScheme],
  ];
  for (const [teamName, stats, scheme] of sides) {
    const row = {
      match_label: matchLabel,
      match_date: matchDateIso,
      competition: meta.competition,
      club_id: clubIdByName.get(teamName),
      duration: meta.durationMinutes,
      scheme,
      goals: parseNumber(stats.goals),
      xg: parseNumber(stats.xg),
      possession_pct: parseNumber(stats.possession_pct ?? stats.possession),
      stats,
    };
    const { error } = await supabase.from("team_match_stats").upsert(row, { onConflict: "match_label,club_id" });
    if (error) throw new Error(`team_match_stats upsert failed for ${teamName}: ${error.message}`);
  }

  if (data.timeSegments) {
    const { error: delErr } = await supabase.from("match_time_segments").delete().eq("match_id", matchId).in("club_id", [homeId, awayId]);
    if (delErr) throw new Error(`match_time_segments delete failed: ${delErr.message}`);

    const segmentRows = [
      ...buildTimeSegmentRows(matchId, homeId, data.timeSegments.home),
      ...buildTimeSegmentRows(matchId, awayId, data.timeSegments.away),
    ];
    const { error } = await supabase.from("match_time_segments").insert(segmentRows);
    if (error) throw new Error(`match_time_segments insert failed: ${error.message}`);
  }

  let passCombinationsInserted = 0;
  let passPlayersSkipped = 0;
  const passSides = [
    data.passCombinationsHome ? { clubId: homeId, summary: data.passCombinationsHome } : null,
    data.passCombinationsAway ? { clubId: awayId, summary: data.passCombinationsAway } : null,
  ].filter((s): s is { clubId: string; summary: NonNullable<typeof data.passCombinationsHome> } => s !== null);
  if (passSides.length > 0) {
    const result = await insertPassCombinations(supabase, matchId, passSides);
    passCombinationsInserted = result.combinationsInserted;
    passPlayersSkipped = result.playersSkipped;
  }

  const eventsInserted = await insertMatchEvents(supabase, matchId, [
    { clubId: homeId, events: data.matchEvents?.home ?? [] },
    { clubId: awayId, events: data.matchEvents?.away ?? [] },
  ]);

  const lineupsInserted = await insertStartingLineups(supabase, matchId, [
    { clubId: homeId, players: data.startingLineups?.home ?? [] },
    { clubId: awayId, players: data.startingLineups?.away ?? [] },
  ]);

  return { matchId, matchStatus, homeTeam, awayTeam, matchLabel, passCombinationsInserted, passPlayersSkipped, eventsInserted, lineupsInserted };
}
