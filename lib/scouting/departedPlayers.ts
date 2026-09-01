// lib/scouting/departedPlayers.ts
// Players who left the squad ahead of the new season — split into foreign
// ("asing") and local ("lokal") groups per how the user described them.
// Their Nexus history (if any) is still tagged to this team from last
// season, so no cross-team lookup is needed — just search the team's own
// `players` list (same one fetchTeamPlayers already returns).

export interface DepartedPlayerInput {
  name: string;
  /** Exact `player_name` in mv_players_complete, if found. */
  nexusName?: string;
  /** Country of origin — shown for foreign ("asing") players. */
  origin?: string;
  /** Short note, e.g. "Kapten". */
  note?: string;
  group: "asing" | "lokal";
}

export const DEPARTED_PLAYERS_BY_TEAM: Record<string, DepartedPlayerInput[]> = {
  "Persita Tangerang": [
    { name: "Bae Sin-yeong", nexusName: "Sin-Young Bae", origin: "South Korea", group: "asing" },
    { name: "Matheus Alves", nexusName: "Matheus Alves", origin: "Brazil", group: "asing" },
    { name: "Dejan Racic", nexusName: "D. Račić", origin: "Montenegro", group: "asing" },
    { name: "Ramon Bueno", nexusName: "Ramón Bueno", origin: "Spain", group: "asing" },
    { name: "Muhammad Toha", nexusName: "M. Toha", note: "Captain", group: "lokal" },
    { name: "Andrean Benyamin", group: "lokal" },
    { name: "Ahmad Fahd", group: "lokal" },
    { name: "Badrian Ilham", group: "lokal" },
    { name: "Rafi Pamungkas", group: "lokal" },
    { name: "Jack Brown", nexusName: "J. Brown", group: "lokal" },
    { name: "Fairuz Ohorella", group: "lokal" },
    { name: "Cois Artomoro", group: "lokal" },
    { name: "Tegar Infantrie", group: "lokal" },
  ],
};
