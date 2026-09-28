// app/api/match-reports/preview/route.ts
// Parses uploaded match report PDFs and returns the extracted data WITHOUT
// touching the database — lets the browser show a review step before the
// separate /import call commits anything.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { parseMatchReportPdf } from "@/lib/matchReport/parseMatchReport";

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
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const results = [];
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extracted = await parseMatchReportPdf(bytes);
      results.push({ fileName: file.name, ok: true as const, ...extracted });
    } catch (err) {
      results.push({ fileName: file.name, ok: false as const, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
}
