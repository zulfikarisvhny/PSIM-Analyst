// app/api/physical-stats/import/route.ts
// Takes already-extracted reports (from /api/physical-stats/preview, reviewed
// in the browser — including any player-match corrections) and commits them
// to the database. Any authenticated user can call this (unlike
// /api/admin/*) — middleware.ts already gates the whole app, so getUser()
// here just confirms the session is real.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";
import { insertPhysicalStats, type PlayerRowWithMatch } from "@/lib/physicalStats/insertPhysicalStats";
import type { CatapultSessionMeta } from "@/lib/physicalStats/parseCatapultReport";

export const runtime = "nodejs";

interface FileResult {
  fileName: string;
  ok: boolean;
  error?: string;
  clubName?: string;
  sessionDateIso?: string;
  playerCount?: number;
  unmatchedCount?: number;
}

interface ReportPayload {
  fileName: string;
  meta: CatapultSessionMeta;
  players: PlayerRowWithMatch[];
  matchId: number | null;
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
  const reports: ReportPayload[] = body.reports;
  if (!Array.isArray(reports) || reports.length === 0) {
    return NextResponse.json({ error: "No reports to import" }, { status: 400 });
  }

  const admin = createPsimAdminClient();
  const results: FileResult[] = [];

  for (const report of reports) {
    try {
      const { clubName, sessionDateIso, playerCount, unmatchedCount } = await insertPhysicalStats(
        { meta: report.meta, players: report.players, matchId: report.matchId },
        admin
      );
      results.push({
        fileName: report.fileName,
        ok: true,
        clubName,
        sessionDateIso: sessionDateIso ?? undefined,
        playerCount,
        unmatchedCount,
      });
    } catch (err) {
      results.push({ fileName: report.fileName, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
}
