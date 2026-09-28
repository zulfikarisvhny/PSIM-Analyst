// app/api/team-style/preview/route.ts
// Parses an uploaded "Team Stats" xlsx export and returns the computed
// per-team averages WITHOUT touching the database — lets the browser show a
// review step (and let the user pick which teams to import) before the
// separate /import call commits anything.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { parseTeamStyleXlsx } from "@/lib/teamStyle/parseTeamStyleXlsx";

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
    const allResults = await parseTeamStyleXlsx(bytes);
    // Every team that ever played the subject team shows up in the file, but
    // only with as many rows as they faced the subject team (often just 1) —
    // not a fair "style" sample. Keep only the team(s) with the most matches,
    // i.e. the one(s) this export is actually about.
    const maxMatches = Math.max(0, ...allResults.map((r) => r.metrics.matchesPlayed));
    const results = allResults.filter((r) => r.metrics.matchesPlayed === maxMatches);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
