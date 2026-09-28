// app/api/players/import/route.ts
// Re-parses the uploaded xlsx (already reviewed via /api/players/preview —
// the file is small enough, and there's no realistic per-row editing UI for
// 300+ players, so re-uploading here avoids round-tripping the full parsed
// payload) and commits it. Any authenticated user can call this (unlike
// /api/admin/*) — middleware.ts already gates the whole app, so getUser()
// here just confirms the session is real.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";
import { parsePlayerStatsXlsx } from "@/lib/players/parsePlayerStatsXlsx";
import { insertPlayerStats } from "@/lib/players/insertPlayerStats";

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
  const season = formData.get("season");
  const competition = formData.get("competition");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (typeof season !== "string" || typeof competition !== "string" || !season || !competition) {
    return NextResponse.json({ error: "Season and competition are required" }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const rows = await parsePlayerStatsXlsx(bytes);
    const admin = createPsimAdminClient();
    const summary = await insertPlayerStats(rows, season, competition, admin);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
