// app/api/team-style/import/route.ts
// Takes already-computed team-style results (from /api/team-style/preview,
// reviewed in the browser) and commits the selected ones to the database.
// Any authenticated user can call this (unlike /api/admin/*) — middleware.ts
// already gates the whole app, so getUser() here just confirms the session
// is real.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";
import { insertTeamStyleStats } from "@/lib/teamStyle/insertTeamStyleStats";
import type { TeamStyleResult } from "@/lib/teamStyle/parseTeamStyleXlsx";

export const runtime = "nodejs";

interface TeamResult {
  teamName: string;
  ok: boolean;
  error?: string;
  matchesPlayed?: number;
}

export async function POST(request: Request) {
  const supabase = createPsimServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const teams: TeamStyleResult[] = body.teams;
  if (!Array.isArray(teams) || teams.length === 0) {
    return NextResponse.json({ error: "No teams to import" }, { status: 400 });
  }

  const admin = createPsimAdminClient();
  const results: TeamResult[] = [];

  for (const team of teams) {
    try {
      const { teamName, matchesPlayed } = await insertTeamStyleStats(team, admin);
      results.push({ teamName, ok: true, matchesPlayed });
    } catch (err) {
      results.push({ teamName: team.teamName, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
}
