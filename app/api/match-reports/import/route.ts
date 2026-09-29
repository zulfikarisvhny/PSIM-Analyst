// app/api/match-reports/import/route.ts
// Takes already-extracted reports (from /api/match-reports/preview, reviewed
// in the browser) and commits them to the database. Any authenticated user
// can call this (unlike /api/admin/*) — middleware.ts already gates the
// whole app, so getUser() here just confirms the session is real.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";
import { insertMatchReport } from "@/lib/matchReport/insertMatchReport";
import type { ExtractedMatchReport } from "@/lib/matchReport/parseMatchReport";

export const runtime = "nodejs";

interface FileResult {
  fileName: string;
  ok: boolean;
  error?: string;
  matchLabel?: string;
  matchStatus?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  passCombinationsInserted?: number;
  passPlayersSkipped?: number;
  eventsInserted?: number;
  lineupsInserted?: number;
  eventLocationsInserted?: number;
  formationLineupsInserted?: number;
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
  const reports: (ExtractedMatchReport & { fileName: string })[] = body.reports;
  if (!Array.isArray(reports) || reports.length === 0) {
    return NextResponse.json({ error: "No reports to import" }, { status: 400 });
  }

  const admin = createPsimAdminClient();
  const results: FileResult[] = [];

  for (const report of reports) {
    try {
      const {
        matchStatus,
        matchLabel,
        passCombinationsInserted,
        passPlayersSkipped,
        eventsInserted,
        lineupsInserted,
        eventLocationsInserted,
        formationLineupsInserted,
      } = await insertMatchReport(
        {
          meta: report.meta,
          teamStatsHome: report.teamStatsHome,
          teamStatsAway: report.teamStatsAway,
          homeScheme: report.homeScheme,
          awayScheme: report.awayScheme,
          timeSegments: report.timeSegments,
          passCombinationsHome: report.passCombinationsHome,
          passCombinationsAway: report.passCombinationsAway,
          matchEvents: report.matchEvents,
          startingLineups: report.startingLineups,
          averagePositions: report.averagePositions,
          shots: report.shots,
          losses: report.losses,
          recoveries: report.recoveries,
          keyPasses: report.keyPasses,
          crosses: report.crosses,
          startingFormationLineup: report.startingFormationLineup,
          finalFormationLineup: report.finalFormationLineup,
        },
        admin
      );
      results.push({
        fileName: report.fileName,
        ok: true,
        matchLabel,
        matchStatus,
        homeScore: report.meta.homeScore,
        awayScore: report.meta.awayScore,
        passCombinationsInserted,
        passPlayersSkipped,
        eventsInserted,
        lineupsInserted,
        eventLocationsInserted,
        formationLineupsInserted,
      });
    } catch (err) {
      results.push({ fileName: report.fileName, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
}
