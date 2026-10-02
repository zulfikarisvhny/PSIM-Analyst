// lib/scouting/psimVideoTypes.ts
// Client-safe: the VideoRow shape plus pure URL-parsing helpers. No server
// imports, so client components can use these without pulling next/headers
// into the browser bundle.
export interface VideoRow {
  id: number;
  title: string;
  url: string;
  category: string;
  description: string | null;
  createdAt: string;
}

export const VIDEO_CATEGORIES = ["Match", "Training", "Opponent Scouting", "Analysis"] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export interface VideoEmbed {
  provider: "youtube" | "drive" | "unknown";
  embedUrl: string | null;
}

/** Turns a pasted YouTube/Google Drive share link into an iframe-embeddable URL. */
export function getVideoEmbed(url: string): VideoEmbed {
  const trimmed = url.trim();

  const youtubePatterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const pattern of youtubePatterns) {
    const match = trimmed.match(pattern);
    if (match) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${match[1]}` };
  }

  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) return { provider: "drive", embedUrl: `https://drive.google.com/file/d/${driveFileMatch[1]}/preview` };

  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) return { provider: "drive", embedUrl: `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview` };

  return { provider: "unknown", embedUrl: null };
}

export interface ParsedVideoEntry {
  title: string;
  url: string;
  category: string;
  description: string | null;
}

const URL_RE = /(https?:\/\/\S+)/;
const NUMBERED_LINE_RE = /^(\d+)[.)]\s*(.*)$/;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Parses a pasted block like:
 *   DAILY TRAINING - Thursday 1 October 2026
 *   1. https://youtu.be/...
 *   2. https://youtu.be/...
 *   GOALKEEPER
 *   1. https://youtu.be/...
 * into one video entry per numbered link. The first line is the session
 * title; any other non-numbered line starts a new sub-group (used as the
 * category, and appended to the title) until the next one.
 */
export function parseVideoBatch(text: string): ParsedVideoEntry[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const sessionTitle = lines[0];
  let currentGroup: string | null = null;
  const entries: ParsedVideoEntry[] = [];

  for (const line of lines.slice(1)) {
    const numbered = line.match(NUMBERED_LINE_RE);
    if (numbered) {
      const [, num, rest] = numbered;
      const urlMatch = rest.match(URL_RE);
      if (!urlMatch) continue;
      const url = urlMatch[1].trim();
      const description = rest.replace(url, "").trim() || null;
      const title = `${sessionTitle}${currentGroup ? ` — ${titleCase(currentGroup)}` : ""} #${num}`;
      entries.push({ title, url, category: currentGroup ? titleCase(currentGroup) : "Training", description });
    } else {
      currentGroup = line;
    }
  }

  return entries;
}
