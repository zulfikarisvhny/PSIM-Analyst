// lib/scouting/leagueLeaders.ts
// Server-only. League Leaders is built entirely from real, parsed match
// reports (match_event_locations, match_events, match_passing_summary in the
// PSIM project) — not mv_players_complete ("Nexus"), which is a separate
// pre-aggregated dataset unrelated to anything actually uploaded here. That
// means coverage is only as wide as the matches imported so far (currently
// a handful), not the full league — it grows as more reports are uploaded.
// The row shape + stat catalog live in leagueLeadersCategories.ts (no
// server-only imports) so the client board component can use them directly.
import { createPsimServerClient } from "../supabase/psimServerClient";
import type { LeagueLeaderRawRow } from "./leagueLeadersCategories";

export type { LeagueLeaderRawRow } from "./leagueLeadersCategories";

const PAGE_SIZE = 1000;

/** Same 1000-row PostgREST cap as matchReportsBrowse.ts — match_event_locations alone is already past it. */
async function fetchAllRows<T>(queryFactory: () => { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }> }): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await queryFactory().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function fetchLeagueLeaders(): Promise<LeagueLeaderRawRow[]> {
  const supabase = createPsimServerClient();

  const [{ data: players }, { data: clubs }, eventLocationRows, eventRows, passSummaryRows] = await Promise.all([
    supabase.from("players").select("id, name, club_id, photo_url"),
    supabase.from("clubs").select("id, name, logo_url"),
    fetchAllRows<{ match_id: number; club_id: number; player_id: number | null; kind: string; outcome: string | null }>(() =>
      supabase.from("match_event_locations").select("match_id, club_id, player_id, kind, outcome")
    ),
    fetchAllRows<{ match_id: number; club_id: number; player_id: number | null; event_type: string }>(() =>
      supabase.from("match_events").select("match_id, club_id, player_id, event_type")
    ),
    fetchAllRows<{ match_id: number; player_id: number; total_passes: number | null }>(() =>
      supabase.from("match_passing_summary").select("match_id, player_id, total_passes")
    ),
  ]);

  const clubById = new Map(((clubs ?? []) as { id: number; name: string; logo_url: string | null }[]).map((c) => [c.id, c]));

  interface Agg {
    playerId: number;
    name: string;
    clubId: number;
    photoUrl: string | null;
    matches: Set<number>;
    goals: number;
    shots: number;
    shotsOnTarget: number;
    keyPasses: number;
    crosses: number;
    losses: number;
    recoveries: number;
    totalPasses: number;
    yellowCards: number;
    redCards: number;
  }

  const byPlayer = new Map<number, Agg>();
  function entry(playerId: number, clubId: number): Agg {
    let e = byPlayer.get(playerId);
    if (!e) {
      const p = (players ?? []).find((p) => p.id === playerId);
      e = {
        playerId,
        name: p?.name ?? `Player #${playerId}`,
        clubId,
        photoUrl: p?.photo_url ?? null,
        matches: new Set(),
        goals: 0,
        shots: 0,
        shotsOnTarget: 0,
        keyPasses: 0,
        crosses: 0,
        losses: 0,
        recoveries: 0,
        totalPasses: 0,
        yellowCards: 0,
        redCards: 0,
      };
      byPlayer.set(playerId, e);
    }
    return e;
  }

  for (const r of eventLocationRows) {
    if (r.player_id === null) continue;
    const e = entry(r.player_id, r.club_id);
    e.matches.add(r.match_id);
    if (r.kind === "shot") {
      e.shots++;
      if (r.outcome === "goal" || r.outcome === "on_target") e.shotsOnTarget++;
    } else if (r.kind === "key_pass") e.keyPasses++;
    else if (r.kind === "cross") e.crosses++;
    else if (r.kind === "loss") e.losses++;
    else if (r.kind === "recovery") e.recoveries++;
  }

  for (const r of eventRows) {
    if (r.player_id === null) continue;
    const e = entry(r.player_id, r.club_id);
    e.matches.add(r.match_id);
    if (r.event_type === "goal") e.goals++;
    else if (r.event_type === "yellow_card") e.yellowCards++;
    else if (r.event_type === "red_card") e.redCards++;
  }

  for (const r of passSummaryRows) {
    const p = (players ?? []).find((p) => p.id === r.player_id);
    if (!p) continue;
    const e = entry(r.player_id, p.club_id);
    e.matches.add(r.match_id);
    e.totalPasses += r.total_passes ?? 0;
  }

  return [...byPlayer.values()].map((e) => ({
    playerId: e.playerId,
    name: e.name,
    team: clubById.get(e.clubId)?.name ?? "Unknown",
    logoUrl: clubById.get(e.clubId)?.logo_url ?? null,
    photoUrl: e.photoUrl,
    matchesInvolved: e.matches.size,
    goals: e.goals,
    shots: e.shots,
    shotsOnTarget: e.shotsOnTarget,
    keyPasses: e.keyPasses,
    crosses: e.crosses,
    losses: e.losses,
    recoveries: e.recoveries,
    totalPasses: e.totalPasses,
    yellowCards: e.yellowCards,
    redCards: e.redCards,
  }));
}
