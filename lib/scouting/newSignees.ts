// lib/scouting/newSignees.ts
// New signings not yet reflected under a team's own name in mv_players_complete
// — either their Nexus history is still tagged to their previous club
// (nexusName set, real stats), or they have no Nexus data at all
// (nexusName omitted). Used to make them selectable in the Formation
// Analysis lineup picker even before Nexus catches up.

export interface NewSigneeInput {
  name: string;
  /** Exact `player_name` in mv_players_complete, if they have any Nexus history (often under their old club). */
  nexusName?: string;
  positionGroup: string;
  /** Short tactical/origin note, e.g. "Target Man" or "Lulusan Akademi Persita" — shown in place of the generic "eks <club>" subtitle when set. */
  note?: string;
}

export const NEW_SIGNEES_BY_TEAM: Record<string, NewSigneeInput[]> = {
  "Persita Tangerang": [
    { name: "Alexandre Ramalingom", nexusName: "A. Ramalingom", positionGroup: "CF", note: "Target Man" },
    { name: "Luquinhas", nexusName: "Luquinhas", positionGroup: "LW" },
    { name: "Tyronne", nexusName: "Tyronne", positionGroup: "AM" },
    { name: "Rifky Dwi Septiawan", nexusName: "R. Septiawan", positionGroup: "DM" },
    { name: "Wahyudi Hamisi", nexusName: "W. Hamisi", positionGroup: "DM" },
    { name: "Sutanto Tan", nexusName: "S. Tan", positionGroup: "DM" },
    { name: "Diovani Rafly", positionGroup: "RB", note: "Lulusan Akademi Persita" }, // no Nexus record under any name tried
    // Zalnando and Aep Nursofyan dropped from this list — both already
    // tagged directly to "Persita" in Nexus with real minutes, so they stay
    // in the general roster (and the Formation Analysis lineup picker)
    // without appearing as a "new signee" card.
  ],
};
