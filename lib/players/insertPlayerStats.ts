// lib/players/insertPlayerStats.ts
// Server-only. Bulk-upserts clubs, players (matched on name+club — same
// identity rule as extract-PDF/extract_player_stats.py, which is what
// created the players_name_club_unique constraint these upserts rely on),
// then player_season_stats (matched on player_id+season+competition). A
// player whose name+club isn't already in `players` gets a new row/id
// (a "new signing"); everyone else just gets their stats refreshed in place.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedPlayerRow } from "./parsePlayerStatsXlsx";

export interface ImportSummary {
  clubCount: number;
  newPlayers: number;
  updatedPlayers: number;
  statsRowsWritten: number;
}

export async function insertPlayerStats(
  rows: ParsedPlayerRow[],
  season: string,
  competition: string,
  supabase: SupabaseClient
): Promise<ImportSummary> {
  if (rows.length === 0) throw new Error("No player rows to import");

  const clubNames = Array.from(new Set(rows.map((r) => r.team)));
  const { error: clubsErr } = await supabase.from("clubs").upsert(
    clubNames.map((name) => ({ name })),
    { onConflict: "name" }
  );
  if (clubsErr) throw new Error(`clubs upsert failed: ${clubsErr.message}`);

  const { data: clubRows, error: clubLookupErr } = await supabase.from("clubs").select("id, name").in("name", clubNames);
  if (clubLookupErr) throw new Error(`clubs lookup failed: ${clubLookupErr.message}`);
  const clubIdByName = new Map((clubRows ?? []).map((c: { id: number; name: string }) => [c.name, c.id]));

  const clubIds = Array.from(clubIdByName.values());
  const { data: existingPlayers, error: playersLookupErr } = await supabase
    .from("players")
    .select("id, name, club_id")
    .in("club_id", clubIds);
  if (playersLookupErr) throw new Error(`players lookup failed: ${playersLookupErr.message}`);
  const existingKeys = new Set((existingPlayers ?? []).map((p: { name: string; club_id: number }) => `${p.club_id}:${p.name}`));

  let newPlayers = 0;
  let updatedPlayers = 0;
  const playerUpsertRows = rows
    .map((row) => {
      const clubId = clubIdByName.get(row.team);
      if (!clubId) return null;
      const isNew = !existingKeys.has(`${clubId}:${row.player}`);
      if (isNew) newPlayers++;
      else updatedPlayers++;
      return {
        club_id: clubId,
        name: row.player,
        position: row.position,
        position_group: row.positionGroup,
        nationality: row.nationality,
        preferred_foot: row.foot,
        age: row.age,
        status: "active",
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error: playersUpsertErr } = await supabase.from("players").upsert(playerUpsertRows, { onConflict: "name,club_id" });
  if (playersUpsertErr) throw new Error(`players upsert failed: ${playersUpsertErr.message}`);

  const { data: allPlayers, error: allPlayersErr } = await supabase.from("players").select("id, name, club_id").in("club_id", clubIds);
  if (allPlayersErr) throw new Error(`players re-lookup failed: ${allPlayersErr.message}`);
  const playerIdByKey = new Map((allPlayers ?? []).map((p: { id: number; name: string; club_id: number }) => [`${p.club_id}:${p.name}`, p.id]));

  const statsRows = rows
    .map((row) => {
      const clubId = clubIdByName.get(row.team);
      const playerId = clubId ? playerIdByKey.get(`${clubId}:${row.player}`) : undefined;
      if (!clubId || !playerId) return null;
      return {
        player_id: playerId,
        club_id: clubId,
        season,
        competition,
        position: row.position,
        age: row.age,
        market_value: row.marketValue,
        contract_expires: row.contractExpires,
        matches_played: row.matchesPlayed,
        minutes_played: row.minutesPlayed,
        goals: row.goals,
        xg: row.xg,
        assists: row.assists,
        xa: row.xa,
        stats: row.stats,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error: statsErr } = await supabase
    .from("player_season_stats")
    .upsert(statsRows, { onConflict: "player_id,season,competition" });
  if (statsErr) throw new Error(`player_season_stats upsert failed: ${statsErr.message}`);

  return { clubCount: clubNames.length, newPlayers, updatedPlayers, statsRowsWritten: statsRows.length };
}
