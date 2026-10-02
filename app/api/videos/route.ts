// app/api/videos/route.ts
// Any authenticated user can call this (unlike /api/admin/*) — middleware.ts
// already gates the whole app, so getUser() here just confirms the session
// is real.
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";
import { getVideoEmbed } from "@/lib/scouting/psimVideoTypes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createPsimServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : "Match";
  const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;

  if (!title || !url) {
    return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
  }
  if (getVideoEmbed(url).provider === "unknown") {
    return NextResponse.json({ error: "Only YouTube or Google Drive links are supported" }, { status: 400 });
  }

  const admin = createPsimAdminClient();
  const { data, error } = await admin
    .from("videos")
    .insert({ title, url, category, description })
    .select("id, title, url, category, description, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    video: {
      id: data.id,
      title: data.title,
      url: data.url,
      category: data.category,
      description: data.description,
      createdAt: data.created_at,
    },
  });
}
