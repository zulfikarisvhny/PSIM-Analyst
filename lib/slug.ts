// lib/slug.ts
// Shared by every "raw export header -> DB column name" mapping in this app
// (Wyscout match-report labels, Wyscout player-stats export columns, ...).
export function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
