// lib/scouting/psimVideos.ts
// Server-only (imports next/headers via createPsimServerClient) — do not
// import this from a "use client" component.
import { createPsimServerClient } from "../supabase/psimServerClient";
import type { VideoRow } from "./psimVideoTypes";

export type { VideoRow } from "./psimVideoTypes";

interface RawRow {
  id: number;
  title: string;
  url: string;
  category: string;
  description: string | null;
  created_at: string;
}

export async function fetchVideos(): Promise<VideoRow[]> {
  const supabase = createPsimServerClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, url, category, description, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`videos query failed: ${error.message}`);

  return ((data ?? []) as RawRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category,
    description: row.description,
    createdAt: row.created_at,
  }));
}
