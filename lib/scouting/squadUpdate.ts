// lib/scouting/squadUpdate.ts
// Hand-transcribed from scouting notes (not derivable from Supabase — new
// signees below aren't in the Nexus database at all). Verify before matchday.

export interface DepartedPlayer {
  /** Must match `player_name` in mv_players_complete for the real-data lookup. */
  nexusName: string;
  role: string;
  note: string;
}

export const SQUAD_UPDATE_WARNING =
  "Since last season, five key players have left the club — Ilja Spasojević, Privat Mbarga, Ryo Matsumura, " +
  "Sho Yamamoto, and Slavko Damjanović. Some of the patterns described above (including Damjanović's role as a " +
  "distributor from center-back) have likely already been taken over by new players. The current lineup should be verified before matchday.";

export const DEPARTED_PLAYERS: DepartedPlayer[] = [
  { nexusName: "I. Spasojević", role: "Striker (Poacher)", note: "A pure penalty-box striker — touches in the box well above the league average." },
  { nexusName: "P. Mbarga", role: "Winger (Classic Winger)", note: "One of two main wingers last season, a strong xA contributor on the right flank." },
  { nexusName: "R. Matsumura", role: "Attacking Midfielder (Advanced Playmaker)", note: "Linked midfield to attack — the team's primary playmaker." },
  { nexusName: "S. Yamamoto", role: "Defensive Midfielder (Holding Midfielder)", note: "Best passing accuracy in midfield, fewest fouls among midfield players." },
  { nexusName: "S. Damjanović", role: "Center-Back (Ball-Playing Defender)", note: "The team's primary distributor from the back — highest long-pass volume and accuracy among center-backs." },
  { nexusName: "B. Doumbia", role: "Striker (Target Man)", note: "One of the center-forward options last season, was a regular starter for a spell (1,609 minutes)." },
];

export interface NewSignee {
  name: string;
  /** Exact `player_name` in mv_players_complete, if this signee has real Nexus data (e.g. from a previous club/league that's tracked). Undefined = no data at all. */
  nexusName?: string;
  previousClub: string;
  position: string;
  note: string;
  /** Departed player this signing likely replaces — a direct swap comparison (signee vs the specific player who left). */
  likelyReplaces?: string;
  /** Exact `player_name`s from the CURRENT Bhayangkara roster to compare against, for an "is this an upgrade" read when there's no single departed player to pair against. Curated manually — not just "everyone in this position_group". */
  compareToCurrentNames?: string[];
}

export const NEW_SIGNEES: NewSignee[] = [
  {
    name: "M. Ristovski",
    nexusName: "M. Ristovski",
    previousClub: "Bohemians 1905 (Czech Liga 1)",
    position: "CF",
    note: "A new striker from the Czech Republic. His Nexus data profile is similar to B. Doumbia, who just left — see the direct comparison below.",
    likelyReplaces: "B. Doumbia",
  },
  {
    name: "Allano",
    nexusName: "Allano",
    previousClub: "Persija",
    position: "RW",
    note: "A right winger formerly of Persija, with a Liga 1 track record from last season (2,795 minutes) — compared against Bhayangkara's current wing options.",
    compareToCurrentNames: ["M. Sidibé", "R. Kurnia"],
  },
  {
    name: "Y. Putra",
    nexusName: "Y. Putra",
    previousClub: "PSBS Biak Numfor",
    position: "CM",
    note: "A central midfielder — his data shows a better ball-retention/build-up profile than Bhayangkara's current midfield options.",
    compareToCurrentNames: ["W. Subo Seto", "Ichsan", "Moisés Gaúcho"],
  },
  {
    name: "George Brown",
    previousClub: "—",
    position: "RB",
    note: "A new signing at right-back, not yet assessed as a significant threat based on early observation.",
  },
  {
    name: "Muhammad Ragil",
    previousClub: "Kendal Tornado",
    position: "LW / CF",
    note: "Was far sharper last season when deployed on the left wing — 75% of his goals came from that position (14 appearances at LW vs. 6 at CF). No track record yet at Super League level.",
    likelyReplaces: "P. Mbarga",
  },
  {
    name: "Reza Kusuma",
    previousClub: "PSPS Pekanbaru (Liga 2)",
    position: "CM / DM",
    note: "A regular starter last season (13 matches, all starts, 1,111 minutes; 8 as CM, 5 as DM). Still young with limited experience at Super League level, but trusted to anchor midfield.",
    likelyReplaces: "R. Matsumura / S. Yamamoto",
  },
];

export interface Reposition {
  /** Must match `player_name` in mv_players_complete. */
  nexusName: string;
  fromPosition: string;
  toPosition: string;
  note: string;
  comparesTo: string; // departed player's nexusName, for the side-by-side
}

export const REPOSITIONING: Reposition = {
  nexusName: "Muhammad Ferarri",
  fromPosition: "RB",
  toPosition: "CB",
  note:
    "Bhayangkara's current right-back options run deep — Putu Gede, Ferarri, and Sani Rizki Fauzi (as a wing-back). " +
    "Ferarri is most likely being shifted into the center-back role to replace Damjanović as the ball-playing defender, " +
    "drawing on his experience playing center-back for Persija and the national team.",
  comparesTo: "S. Damjanović",
};
