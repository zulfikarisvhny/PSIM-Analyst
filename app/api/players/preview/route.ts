// app/api/players/preview/route.ts
// Parses an uploaded weekly Wyscout player-search export xlsx and returns a
// summary WITHOUT touching the database — lets the browser show a review
// step (new vs. existing players) before the separate /import call commits
// anything.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { parsePlayerStatsXlsx } from "@/lib/players/parsePlayerStatsXlsx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createPsimServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const rows = await parsePlayerStatsXlsx(bytes);

    const clubNames = Array.from(new Set(rows.map((r) => r.team)));
    const { data: clubRows } = await supabase.from("clubs").select("id, name").in("name", clubNames);
    const clubIdByName = new Map((clubRows ?? []).map((c: { id: number; name: string }) => [c.name, c.id]));
    const clubIds = Array.from(clubIdByName.values());
    const { data: existingPlayers } = clubIds.length
      ? await supabase.from("players").select("name, club_id").in("club_id", clubIds)
      : { data: [] };
    const existingKeys = new Set((existingPlayers ?? []).map((p: { name: string; club_id: number }) => `${p.club_id}:${p.name}`));

    const players = rows.map((row) => {
      const clubId = clubIdByName.get(row.team);
      const isNew = clubId === undefined || !existingKeys.has(`${clubId}:${row.player}`);
      return {
        player: row.player,
        team: row.team,
        position: row.position,
        age: row.age,
        matchesPlayed: row.matchesPlayed,
        minutesPlayed: row.minutesPlayed,
        goals: row.goals,
        assists: row.assists,
        xg: row.xg,
        xa: row.xa,
        isNew,
      };
    });

    return NextResponse.json({
      totalRows: rows.length,
      clubCount: clubNames.length,
      newCount: players.filter((p) => p.isNew).length,
      players,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
