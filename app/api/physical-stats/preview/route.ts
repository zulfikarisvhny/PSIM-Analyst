// app/api/physical-stats/preview/route.ts
// Parses uploaded Catapult PDFs and returns the extracted data WITHOUT
// touching the database — lets the browser show a review step (including a
// best-effort player-name match per row, and a match_id to link the session
// to, both for the user to confirm/correct) before the separate /import call
// commits anything.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { parseCatapultReportPdf } from "@/lib/physicalStats/parseCatapultReport";
import { matchPlayerName, type PlayerOption } from "@/lib/physicalStats/matchPlayerName";

export const runtime = "nodejs";

interface MatchOption {
  id: number;
  label: string;
  matchDate: string | null;
}

export async function POST(request: Request) {
  const supabase = createPsimServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const rosterCache = new Map<string, PlayerOption[]>();
  async function rosterForClub(clubName: string): Promise<PlayerOption[]> {
    if (rosterCache.has(clubName)) return rosterCache.get(clubName)!;
    const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
    if (!club) {
      rosterCache.set(clubName, []);
      return [];
    }
    const { data: players } = await supabase.from("players").select("id, name").eq("club_id", club.id);
    const roster = players ?? [];
    rosterCache.set(clubName, roster);
    return roster;
  }

  const clubIdCache = new Map<string, number | null>();
  async function clubIdForName(clubName: string): Promise<number | null> {
    if (clubIdCache.has(clubName)) return clubIdCache.get(clubName)!;
    const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
    clubIdCache.set(clubName, club?.id ?? null);
    return club?.id ?? null;
  }

  const matchesCache = new Map<number, MatchOption[]>();
  async function matchesForClub(clubId: number): Promise<MatchOption[]> {
    if (matchesCache.has(clubId)) return matchesCache.get(clubId)!;
    const { data } = await supabase
      .from("matches")
      .select("id, match_date, home:clubs!home_club_id(name), away:clubs!away_club_id(name)")
      .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
      .order("match_date", { ascending: false });
    const options: MatchOption[] = (data ?? []).map((m: any) => ({
      id: m.id,
      matchDate: m.match_date,
      label: `${m.home?.name ?? "?"} vs ${m.away?.name ?? "?"} (${m.match_date})`,
    }));
    matchesCache.set(clubId, options);
    return options;
  }

  const results = [];
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extracted = await parseCatapultReportPdf(bytes);
      const roster = extracted.meta.clubName ? await rosterForClub(extracted.meta.clubName) : [];
      const clubId = extracted.meta.clubName ? await clubIdForName(extracted.meta.clubName) : null;
      const matches = clubId ? await matchesForClub(clubId) : [];
      const suggestedMatchId = matches.find((m) => m.matchDate === extracted.meta.sessionDateIso)?.id ?? null;
      const players = extracted.players.map((p) => ({ ...p, match: matchPlayerName(p.playerNameRaw, roster) }));
      results.push({ fileName: file.name, ok: true as const, meta: extracted.meta, players, roster, matches, suggestedMatchId });
    } catch (err) {
      results.push({ fileName: file.name, ok: false as const, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
}
