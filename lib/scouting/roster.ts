// lib/scouting/roster.ts
// Per-team most-used XI, transcribed from squad exports (number, position,
// appearances, minutes, touches) for different match filters. No average
// X/Y touch-location data is available from any source — (x, y) below is
// adapted by hand from MidBlock-style reference screenshots the user shared
// per team/filter, not computed from real coordinates. Confidence on exact
// pixel positions is best-effort, same spirit as the rest of this file.

export type PositionCategory = "G" | "D" | "M" | "F";
export type RosterFilter = "all" | "win" | "draw" | "loss";

export interface RosterPlayer {
  number: number;
  shortName: string;
  fullName: string;
  position: PositionCategory;
  apps: number;
  minutes: number;
  touches: number;
  x: number; // fractional pitch position, 0–1 (0 = left touchline)
  y: number; // fractional pitch position, 0–1 (0 = attacking end, 1 = own goal)
}

const BHAYANGKARA_ROSTER: Record<RosterFilter, RosterPlayer[]> = {
  all: [
    { number: 1, shortName: "A. Savik", fullName: "Aqil Savik", position: "G", apps: 30, minutes: 2599, touches: 898, x: 0.5, y: 0.93 },
    { number: 2, shortName: "P. G. J. Antara", fullName: "Putu Gede Juni Antara", position: "D", apps: 25, minutes: 2171, touches: 1365, x: 0.79, y: 0.58 },
    { number: 4, shortName: "N. Sadiki", fullName: "Nehar Sadiki", position: "D", apps: 30, minutes: 2641, touches: 1745, x: 0.61, y: 0.68 },
    { number: 5, shortName: "Moisés", fullName: "Moisés", position: "M", apps: 26, minutes: 2101, touches: 1304, x: 0.5, y: 0.56 },
    { number: 10, shortName: "C. Henry", fullName: "Cédric Henry", position: "F", apps: 18, minutes: 1523, touches: 605, x: 0.5, y: 0.27 },
    { number: 11, shortName: "F. Andika", fullName: "Firza Andika", position: "D", apps: 15, minutes: 1318, touches: 941, x: 0.18, y: 0.56 },
    { number: 15, shortName: "S. Damjanović", fullName: "Slavko Damjanović", position: "D", apps: 29, minutes: 2567, touches: 1643, x: 0.34, y: 0.66 },
    { number: 17, shortName: "M. Sidibé", fullName: "Moussa Sidibé", position: "M", apps: 17, minutes: 1496, touches: 1182, x: 0.56, y: 0.3 },
    { number: 23, shortName: "W. S. Seto", fullName: "Wahyu Subo Seto", position: "M", apps: 29, minutes: 2107, touches: 1364, x: 0.5, y: 0.51 },
    { number: 37, shortName: "P. Mbarga", fullName: "Privat Mbarga", position: "M", apps: 17, minutes: 1409, touches: 855, x: 0.44, y: 0.24 },
    { number: 58, shortName: "F. D. Missa", fullName: "Frengky Deaner Missa", position: "D", apps: 19, minutes: 1221, touches: 1037, x: 0.33, y: 0.56 },
  ],
  win: [
    { number: 1, shortName: "A. Savik", fullName: "Aqil Savik", position: "G", apps: 15, minutes: 1249, touches: 405, x: 0.5, y: 0.92 },
    { number: 2, shortName: "P. G. J. Antara", fullName: "Putu Gede Juni Antara", position: "D", apps: 11, minutes: 957, touches: 586, x: 0.85, y: 0.55 },
    { number: 4, shortName: "N. Sadiki", fullName: "Nehar Sadiki", position: "D", apps: 15, minutes: 1350, touches: 811, x: 0.62, y: 0.66 },
    { number: 5, shortName: "Moisés", fullName: "Moisés", position: "M", apps: 12, minutes: 998, touches: 567, x: 0.45, y: 0.55 },
    { number: 7, shortName: "R. Matsumura", fullName: "Ryo Matsumura", position: "M", apps: 7, minutes: 498, touches: 318, x: 0.48, y: 0.37 },
    { number: 10, shortName: "C. Henry", fullName: "Cédric Henry", position: "F", apps: 10, minutes: 867, touches: 371, x: 0.5, y: 0.29 },
    { number: 15, shortName: "S. Damjanović", fullName: "Slavko Damjanović", position: "D", apps: 13, minutes: 1158, touches: 705, x: 0.34, y: 0.66 },
    { number: 17, shortName: "M. Sidibé", fullName: "Moussa Sidibé", position: "M", apps: 10, minutes: 900, touches: 740, x: 0.56, y: 0.32 },
    { number: 23, shortName: "W. S. Seto", fullName: "Wahyu Subo Seto", position: "M", apps: 15, minutes: 1067, touches: 678, x: 0.55, y: 0.5 },
    { number: 37, shortName: "P. Mbarga", fullName: "Privat Mbarga", position: "M", apps: 9, minutes: 784, touches: 470, x: 0.44, y: 0.26 },
    { number: 58, shortName: "F. D. Missa", fullName: "Frengky Deaner Missa", position: "D", apps: 10, minutes: 730, touches: 610, x: 0.22, y: 0.55 },
  ],
  draw: [
    { number: 1, shortName: "A. Savik", fullName: "Aqil Savik", position: "G", apps: 4, minutes: 360, touches: 166, x: 0.51, y: 0.92 },
    { number: 2, shortName: "P. G. J. Antara", fullName: "Putu Gede Juni Antara", position: "D", apps: 4, minutes: 360, touches: 214, x: 0.67, y: 0.62 },
    { number: 4, shortName: "N. Sadiki", fullName: "Nehar Sadiki", position: "D", apps: 3, minutes: 270, touches: 187, x: 0.62, y: 0.66 },
    { number: 5, shortName: "Moisés", fullName: "Moisés", position: "M", apps: 4, minutes: 330, touches: 209, x: 0.52, y: 0.63 },
    { number: 9, shortName: "I. Spasojević", fullName: "Ilija Spasojević", position: "F", apps: 2, minutes: 146, touches: 61, x: 0.51, y: 0.34 },
    { number: 15, shortName: "S. Damjanović", fullName: "Slavko Damjanović", position: "D", apps: 5, minutes: 450, touches: 225, x: 0.36, y: 0.68 },
    { number: 16, shortName: "F. Sadat", fullName: "Fareed Sadat", position: "F", apps: 2, minutes: 176, touches: 86, x: 0.57, y: 0.32 },
    { number: 20, shortName: "S. R. Fauzi", fullName: "Sani Rizki Fauzi", position: "D", apps: 4, minutes: 291, touches: 218, x: 0.34, y: 0.48 },
    { number: 23, shortName: "W. S. Seto", fullName: "Wahyu Subo Seto", position: "M", apps: 5, minutes: 410, touches: 268, x: 0.39, y: 0.49 },
    { number: 37, shortName: "P. Mbarga", fullName: "Privat Mbarga", position: "F", apps: 2, minutes: 146, touches: 94, x: 0.43, y: 0.37 },
    { number: 41, shortName: "M. Ferarri", fullName: "Muhammad Ferarri", position: "D", apps: 3, minutes: 240, touches: 138, x: 0.78, y: 0.67 },
  ],
  loss: [
    { number: 1, shortName: "A. Savik", fullName: "Aqil Savik", position: "G", apps: 10, minutes: 900, touches: 293, x: 0.5, y: 0.92 },
    { number: 2, shortName: "P. G. J. Antara", fullName: "Putu Gede Juni Antara", position: "D", apps: 9, minutes: 764, touches: 516, x: 0.76, y: 0.57 },
    { number: 4, shortName: "N. Sadiki", fullName: "Nehar Sadiki", position: "D", apps: 11, minutes: 931, touches: 706, x: 0.6, y: 0.66 },
    { number: 5, shortName: "Moisés", fullName: "Moisés", position: "M", apps: 9, minutes: 707, touches: 498, x: 0.54, y: 0.52 },
    { number: 11, shortName: "F. Andika", fullName: "Firza Andika", position: "D", apps: 6, minutes: 540, touches: 390, x: 0.2, y: 0.5 },
    { number: 15, shortName: "S. Damjanović", fullName: "Slavko Damjanović", position: "D", apps: 10, minutes: 869, touches: 649, x: 0.33, y: 0.61 },
    { number: 22, shortName: "D. Sulistyawan", fullName: "Dendi Sulistyawan", position: "M", apps: 6, minutes: 470, touches: 278, x: 0.62, y: 0.37 },
    { number: 23, shortName: "W. S. Seto", fullName: "Wahyu Subo Seto", position: "M", apps: 8, minutes: 564, touches: 367, x: 0.47, y: 0.52 },
    { number: 30, shortName: "C. Ilić", fullName: "Christian Ilić", position: "M", apps: 6, minutes: 475, touches: 335, x: 0.43, y: 0.47 },
    { number: 37, shortName: "P. Mbarga", fullName: "Privat Mbarga", position: "F", apps: 5, minutes: 389, touches: 235, x: 0.38, y: 0.32 },
    { number: 58, shortName: "F. D. Missa", fullName: "Frengky Deaner Missa", position: "D", apps: 7, minutes: 390, touches: 360, x: 0.41, y: 0.53 },
  ],
};

export const FILTER_LABELS: Record<RosterFilter, string> = {
  all: "All Matches",
  win: "Wins",
  draw: "Draws",
  loss: "Losses",
};

export const POSITION_LABELS: Record<PositionCategory, string> = {
  G: "Goalkeeper",
  D: "Defender",
  M: "Midfielder",
  F: "Forward",
};

export interface PositionGroupPlayer {
  number: number;
  shortName: string;
  x: number;
  y: number;
}

export type PositionGroup = "D" | "M" | "F";

// Every player who featured at each broad position this season, per match
// filter — separate from ROSTER_BY_FILTER's "most-used XI" snapshots.
// Adapted by hand from MidBlock reference screenshots; no per-player
// minute/touch data given for these yet, so bubbles render at a uniform size.
const BHAYANGKARA_POSITION_GROUP_MAPS: Record<RosterFilter, Record<PositionGroup, PositionGroupPlayer[]>> = {
  all: {
    D: [
      { number: 11, shortName: "Andika", x: 0.22, y: 0.49 },
      { number: 58, shortName: "Missa", x: 0.1, y: 0.63 },
      { number: 13, shortName: "Idrus", x: 0.66, y: 0.54 },
      { number: 2, shortName: "Antara", x: 0.79, y: 0.57 },
      { number: 20, shortName: "Fauzi", x: 0.56, y: 0.58 },
      { number: 41, shortName: "Ferarri", x: 0.79, y: 0.63 },
      { number: 15, shortName: "Damjanović", x: 0.34, y: 0.65 },
      { number: 3, shortName: "Léo", x: 0.47, y: 0.68 },
      { number: 4, shortName: "Sadiki", x: 0.61, y: 0.66 },
    ],
    // Very cramped/overlapping source screenshot — numbers for Belleggia and
    // Yamamoto are best-effort reads, flag to the user if wrong.
    M: [
      { number: 37, shortName: "Mbarga", x: 0.46, y: 0.32 },
      { number: 17, shortName: "Sidibé", x: 0.57, y: 0.34 },
      { number: 31, shortName: "Plazonja", x: 0.21, y: 0.36 },
      { number: 7, shortName: "Matsumura", x: 0.49, y: 0.38 },
      { number: 22, shortName: "Sulistyawan", x: 0.65, y: 0.4 },
      { number: 30, shortName: "Ilić", x: 0.44, y: 0.46 },
      { number: 77, shortName: "Belleggia", x: 0.45, y: 0.48 },
      { number: 23, shortName: "Seto", x: 0.5, y: 0.5 },
      { number: 72, shortName: "Yamamoto", x: 0.54, y: 0.51 },
      { number: 5, shortName: "Moisés", x: 0.48, y: 0.54 },
      { number: 19, shortName: "Ichsan", x: 0.51, y: 0.55 },
    ],
    // Extremely cramped source screenshot (3-4 bubbles stacked) — low
    // confidence on exact numbers for the central cluster.
    F: [
      { number: 31, shortName: "Plazonja", x: 0.21, y: 0.23 },
      { number: 16, shortName: "Sadat", x: 0.55, y: 0.31 },
      { number: 37, shortName: "Mbarga", x: 0.42, y: 0.35 },
      { number: 7, shortName: "Matsumura", x: 0.48, y: 0.36 },
      { number: 22, shortName: "Sulistyawan", x: 0.56, y: 0.35 },
      { number: 30, shortName: "Ilić", x: 0.62, y: 0.37 },
      { number: 17, shortName: "Sidibé", x: 0.51, y: 0.42 },
      { number: 20, shortName: "Fauzi", x: 0.18, y: 0.42 },
      { number: 8, shortName: "Wahyu", x: 0.78, y: 0.49 },
    ],
  },
  win: {
    D: [
      { number: 11, shortName: "Andika", x: 0.1, y: 0.55 },
      { number: 58, shortName: "Missa", x: 0.2, y: 0.62 },
      { number: 13, shortName: "Idrus", x: 0.9, y: 0.56 },
      { number: 2, shortName: "Antara", x: 0.8, y: 0.52 },
      { number: 20, shortName: "Fauzi", x: 0.86, y: 0.6 },
      { number: 41, shortName: "Ferarri", x: 0.78, y: 0.63 },
      { number: 15, shortName: "Damjanović", x: 0.35, y: 0.66 },
      { number: 3, shortName: "Léo", x: 0.46, y: 0.66 },
      { number: 4, shortName: "Sadiki", x: 0.62, y: 0.67 },
    ],
    M: [
      { number: 37, shortName: "Mbarga", x: 0.46, y: 0.32 },
      { number: 17, shortName: "Sidibé", x: 0.57, y: 0.34 },
      { number: 7, shortName: "Matsumura", x: 0.49, y: 0.38 },
      { number: 30, shortName: "Ilić", x: 0.44, y: 0.46 },
      { number: 77, shortName: "Belleggia", x: 0.45, y: 0.48 },
      { number: 22, shortName: "Sulistyawan", x: 0.65, y: 0.4 },
      { number: 16, shortName: "Sadat", x: 0.79, y: 0.43 },
      { number: 23, shortName: "Seto", x: 0.5, y: 0.5 },
      { number: 72, shortName: "Yamamoto", x: 0.54, y: 0.51 },
      { number: 5, shortName: "Moisés", x: 0.48, y: 0.54 },
      { number: 19, shortName: "Ichsan", x: 0.51, y: 0.55 },
    ],
    F: [
      { number: 31, shortName: "Plazonja", x: 0.21, y: 0.23 },
      { number: 16, shortName: "Sadat", x: 0.55, y: 0.31 },
      { number: 37, shortName: "Mbarga", x: 0.4, y: 0.35 },
      { number: 10, shortName: "Henry", x: 0.47, y: 0.36 },
      { number: 9, shortName: "Spasojević", x: 0.5, y: 0.37 },
      { number: 22, shortName: "Sulistyawan", x: 0.56, y: 0.35 },
      { number: 30, shortName: "Ilić", x: 0.62, y: 0.37 },
      { number: 17, shortName: "Sidibé", x: 0.36, y: 0.44 },
      { number: 20, shortName: "Fauzi", x: 0.18, y: 0.42 },
      { number: 8, shortName: "Wahyu", x: 0.76, y: 0.47 },
    ],
  },
  loss: {
    D: [
      { number: 11, shortName: "Andika", x: 0.2, y: 0.5 },
      { number: 58, shortName: "Missa", x: 0.1, y: 0.56 },
      { number: 2, shortName: "Antara", x: 0.79, y: 0.55 },
      { number: 20, shortName: "Fauzi", x: 0.83, y: 0.61 },
      { number: 41, shortName: "Ferarri", x: 0.8, y: 0.66 },
      { number: 15, shortName: "Damjanović", x: 0.33, y: 0.61 },
      { number: 3, shortName: "Léo", x: 0.5, y: 0.7 },
      { number: 4, shortName: "Sadiki", x: 0.6, y: 0.66 },
    ],
    M: [
      { number: 37, shortName: "Mbarga", x: 0.4, y: 0.31 },
      { number: 31, shortName: "Plazonja", x: 0.22, y: 0.36 },
      { number: 17, shortName: "Sidibé", x: 0.61, y: 0.36 },
      { number: 22, shortName: "Sulistyawan", x: 0.65, y: 0.39 },
      { number: 96, shortName: "Kurnia", x: 0.19, y: 0.47 },
      { number: 30, shortName: "Ilić", x: 0.44, y: 0.47 },
      { number: 20, shortName: "Fauzi", x: 0.7, y: 0.48 },
      { number: 23, shortName: "Seto", x: 0.47, y: 0.52 },
      { number: 19, shortName: "Ichsan", x: 0.55, y: 0.5 },
      { number: 72, shortName: "Yamamoto", x: 0.59, y: 0.51 },
      { number: 5, shortName: "Moisés", x: 0.65, y: 0.52 },
    ],
    // A "Borgelin" label appeared in the source but its number was
    // unreadable under the overlap — omitted rather than guessed.
    F: [
      { number: 37, shortName: "Mbarga", x: 0.35, y: 0.32 },
      { number: 22, shortName: "Sulistyawan", x: 0.52, y: 0.34 },
      { number: 16, shortName: "Sadat", x: 0.58, y: 0.33 },
      { number: 9, shortName: "Spasojević", x: 0.47, y: 0.39 },
      { number: 58, shortName: "Missa", x: 0.67, y: 0.43 },
      { number: 8, shortName: "Wahyu", x: 0.71, y: 0.52 },
    ],
  },
  draw: {
    D: [
      { number: 13, shortName: "Idrus", x: 0.82, y: 0.48 },
      { number: 20, shortName: "Fauzi", x: 0.12, y: 0.57 },
      { number: 11, shortName: "Andika", x: 0.21, y: 0.61 },
      { number: 2, shortName: "Antara", x: 0.67, y: 0.62 },
      { number: 4, shortName: "Sadiki", x: 0.62, y: 0.66 },
      { number: 41, shortName: "Ferarri", x: 0.78, y: 0.67 },
      { number: 15, shortName: "Damjanović", x: 0.36, y: 0.68 },
    ],
    // Distinct roster from the other filters — Kurnia appears with two
    // different numbers (96, 10) across screenshots, kept as given.
    M: [
      { number: 31, shortName: "Plazonja", x: 0.22, y: 0.37 },
      { number: 96, shortName: "Kurnia", x: 0.4, y: 0.38 },
      { number: 10, shortName: "Kurnia", x: 0.51, y: 0.36 },
      { number: 22, shortName: "Nieto", x: 0.6, y: 0.35 },
      { number: 20, shortName: "Fauzi", x: 0.56, y: 0.39 },
      { number: 58, shortName: "Missa", x: 0.78, y: 0.48 },
      { number: 23, shortName: "Seto", x: 0.39, y: 0.49 },
      { number: 7, shortName: "Belleggia", x: 0.49, y: 0.51 },
      { number: 19, shortName: "Ichsan", x: 0.48, y: 0.6 },
      { number: 5, shortName: "Moisés", x: 0.52, y: 0.63 },
    ],
    F: [
      { number: 37, shortName: "Mbarga", x: 0.36, y: 0.32 },
      { number: 10, shortName: "Henry", x: 0.47, y: 0.34 },
      { number: 9, shortName: "Spasojević", x: 0.49, y: 0.35 },
      { number: 16, shortName: "Sadat", x: 0.53, y: 0.33 },
      { number: 30, shortName: "Ilić", x: 0.58, y: 0.35 },
      { number: 17, shortName: "Sidibé", x: 0.51, y: 0.44 },
    ],
  },
};

// Persita's "all" filter is transcribed from "Players Position.csv" (real
// apps/minutes/touches) + one MidBlock-style reference screenshot per filter
// for (x, y). Unlike Bhayangkara, Persita's export only covered SEASON
// TOTALS — there's no separate win/draw/loss apps/minutes/touches
// breakdown. win/draw/loss below reuse each player's season-total
// apps/minutes/touches (not filter-specific) so the pitch view isn't empty —
// only (x, y) and the roster (who started) actually vary by filter here;
// the numbers themselves are season averages, not "as W/D/L" splits like
// Bhayangkara has. Alves (draw) and Bueno (loss) aren't in the roster CSV at
// all — apps/minutes are real season totals from Nexus (mv_players_complete),
// but touches are estimated from the team's average touches-per-minute
// (no total-touches column exists there).
const PERSITA_ROSTER: Record<RosterFilter, RosterPlayer[]> = {
  all: [
    { number: 29, shortName: "I. Rodrigues", fullName: "Igor Rodrigues", position: "G", apps: 33, minutes: 2970, touches: 1445, x: 0.49, y: 0.96 },
    { number: 66, shortName: "M. Jardel", fullName: "Mario Jardel", position: "D", apps: 31, minutes: 2557, touches: 1791, x: 0.27, y: 0.59 },
    { number: 11, shortName: "M. Toha", fullName: "Muhammad Toha", position: "D", apps: 28, minutes: 2419, touches: 1485, x: 0.85, y: 0.57 },
    { number: 5, shortName: "T. Kozubaev", fullName: "Tamirlan Kozubaev", position: "D", apps: 34, minutes: 3041, touches: 2490, x: 0.43, y: 0.68 },
    { number: 8, shortName: "P. Ganet", fullName: "Pablo Ganet", position: "M", apps: 25, minutes: 2247, touches: 1696, x: 0.42, y: 0.49 },
    { number: 33, shortName: "S. Y. Bae", fullName: "Shin-yeong Bae", position: "M", apps: 18, minutes: 1419, touches: 709, x: 0.52, y: 0.54 },
    { number: 19, shortName: "J. Guseynov", fullName: "Javlon Guseynov", position: "M", apps: 31, minutes: 2716, touches: 1980, x: 0.61, y: 0.65 },
    { number: 7, shortName: "R. Rodriguez", fullName: "Rayco Rodriguez", position: "M", apps: 32, minutes: 2823, touches: 2043, x: 0.3, y: 0.4 },
    { number: 10, shortName: "É. Bessa", fullName: "Éber Bessa", position: "M", apps: 18, minutes: 1380, touches: 838, x: 0.48, y: 0.37 },
    { number: 80, shortName: "H. Caraka", fullName: "Hokky Caraka", position: "M", apps: 23, minutes: 1642, touches: 818, x: 0.71, y: 0.38 },
    { number: 93, shortName: "A. Andrejić", fullName: "Aleksa Andrejić", position: "F", apps: 22, minutes: 1623, touches: 776, x: 0.47, y: 0.33 },
  ],
  // Rotated per user correction: the screenshot with overlapping 93/10
  // labels + #33 Bae (originally assumed "Loss") is actually "Win".
  win: [
    { number: 29, shortName: "I. Rodrigues", fullName: "Igor Rodrigues", position: "G", apps: 33, minutes: 2970, touches: 1445, x: 0.49, y: 0.96 },
    { number: 66, shortName: "M. Jardel", fullName: "Mario Jardel", position: "D", apps: 31, minutes: 2557, touches: 1791, x: 0.36, y: 0.61 },
    { number: 11, shortName: "M. Toha", fullName: "Muhammad Toha", position: "D", apps: 28, minutes: 2419, touches: 1485, x: 0.85, y: 0.58 },
    { number: 5, shortName: "T. Kozubaev", fullName: "Tamirlan Kozubaev", position: "D", apps: 34, minutes: 3041, touches: 2490, x: 0.38, y: 0.72 },
    { number: 8, shortName: "P. Ganet", fullName: "Pablo Ganet", position: "M", apps: 25, minutes: 2247, touches: 1696, x: 0.42, y: 0.49 },
    { number: 33, shortName: "S. Y. Bae", fullName: "Shin-yeong Bae", position: "M", apps: 18, minutes: 1419, touches: 709, x: 0.49, y: 0.56 },
    { number: 19, shortName: "J. Guseynov", fullName: "Javlon Guseynov", position: "M", apps: 31, minutes: 2716, touches: 1980, x: 0.61, y: 0.66 },
    { number: 7, shortName: "R. Rodriguez", fullName: "Rayco Rodriguez", position: "M", apps: 32, minutes: 2823, touches: 2043, x: 0.28, y: 0.41 },
    { number: 80, shortName: "H. Caraka", fullName: "Hokky Caraka", position: "M", apps: 23, minutes: 1642, touches: 818, x: 0.74, y: 0.43 },
    { number: 10, shortName: "É. Bessa", fullName: "Éber Bessa", position: "M", apps: 18, minutes: 1380, touches: 838, x: 0.48, y: 0.36 },
    { number: 93, shortName: "A. Andrejić", fullName: "Aleksa Andrejić", position: "F", apps: 22, minutes: 1623, touches: 776, x: 0.48, y: 0.36 },
  ],
  // The screenshot with #77 Alves (originally assumed "Win") is actually "Draw".
  draw: [
    { number: 29, shortName: "I. Rodrigues", fullName: "Igor Rodrigues", position: "G", apps: 33, minutes: 2970, touches: 1445, x: 0.48, y: 0.96 },
    { number: 66, shortName: "M. Jardel", fullName: "Mario Jardel", position: "D", apps: 31, minutes: 2557, touches: 1791, x: 0.16, y: 0.6 },
    { number: 11, shortName: "M. Toha", fullName: "Muhammad Toha", position: "D", apps: 28, minutes: 2419, touches: 1485, x: 0.88, y: 0.54 },
    { number: 5, shortName: "T. Kozubaev", fullName: "Tamirlan Kozubaev", position: "D", apps: 34, minutes: 3041, touches: 2490, x: 0.52, y: 0.65 },
    { number: 8, shortName: "P. Ganet", fullName: "Pablo Ganet", position: "M", apps: 25, minutes: 2247, touches: 1696, x: 0.43, y: 0.51 },
    { number: 33, shortName: "S. Y. Bae", fullName: "Shin-yeong Bae", position: "M", apps: 18, minutes: 1419, touches: 709, x: 0.61, y: 0.54 },
    { number: 19, shortName: "J. Guseynov", fullName: "Javlon Guseynov", position: "M", apps: 31, minutes: 2716, touches: 1980, x: 0.49, y: 0.61 },
    { number: 7, shortName: "R. Rodriguez", fullName: "Rayco Rodriguez", position: "M", apps: 32, minutes: 2823, touches: 2043, x: 0.28, y: 0.39 },
    { number: 80, shortName: "H. Caraka", fullName: "Hokky Caraka", position: "M", apps: 23, minutes: 1642, touches: 818, x: 0.78, y: 0.37 },
    { number: 93, shortName: "A. Andrejić", fullName: "Aleksa Andrejić", position: "F", apps: 22, minutes: 1623, touches: 776, x: 0.52, y: 0.32 },
    { number: 77, shortName: "M. Alves", fullName: "Matheus Alves", position: "F", apps: 17, minutes: 818, touches: 530, x: 0.5, y: 0.17 },
  ],
  // The screenshot with #20 Bueno (originally assumed "Draw") is actually "Loss".
  loss: [
    { number: 29, shortName: "I. Rodrigues", fullName: "Igor Rodrigues", position: "G", apps: 33, minutes: 2970, touches: 1445, x: 0.49, y: 0.96 },
    { number: 66, shortName: "M. Jardel", fullName: "Mario Jardel", position: "D", apps: 31, minutes: 2557, touches: 1791, x: 0.26, y: 0.58 },
    { number: 11, shortName: "M. Toha", fullName: "Muhammad Toha", position: "D", apps: 28, minutes: 2419, touches: 1485, x: 0.84, y: 0.56 },
    { number: 5, shortName: "T. Kozubaev", fullName: "Tamirlan Kozubaev", position: "D", apps: 34, minutes: 3041, touches: 2490, x: 0.43, y: 0.66 },
    { number: 8, shortName: "P. Ganet", fullName: "Pablo Ganet", position: "M", apps: 25, minutes: 2247, touches: 1696, x: 0.41, y: 0.49 },
    { number: 7, shortName: "R. Rodriguez", fullName: "Rayco Rodriguez", position: "M", apps: 32, minutes: 2823, touches: 2043, x: 0.32, y: 0.39 },
    { number: 80, shortName: "H. Caraka", fullName: "Hokky Caraka", position: "M", apps: 23, minutes: 1642, touches: 818, x: 0.66, y: 0.35 },
    { number: 10, shortName: "É. Bessa", fullName: "Éber Bessa", position: "M", apps: 18, minutes: 1380, touches: 838, x: 0.49, y: 0.4 },
    { number: 19, shortName: "J. Guseynov", fullName: "Javlon Guseynov", position: "M", apps: 31, minutes: 2716, touches: 1980, x: 0.67, y: 0.65 },
    { number: 20, shortName: "R. Bueno", fullName: "Ramón Bueno", position: "M", apps: 14, minutes: 981, touches: 635, x: 0.54, y: 0.56 },
    { number: 93, shortName: "A. Andrejić", fullName: "Aleksa Andrejić", position: "F", apps: 22, minutes: 1623, touches: 776, x: 0.43, y: 0.32 },
  ],
};

// Position-group breakdowns for Persita, one reference screenshot per filter.
// Order corrected per user feedback: it's NOT simply All/Win/Draw/Loss in
// the order shared — win/draw/loss are rotated (win↔loss↔draw cycle) vs the
// original assumption. Unlike the roster above, this only needs
// number/shortName/(x,y), so it doesn't have the same missing-apps-data
// problem — populated for all 4 filters. Alves (Win) and Bueno (Loss) aren't
// in the roster CSV; positions are still shown here.
const PERSITA_POSITION_GROUP_MAPS: Record<RosterFilter, Record<PositionGroup, PositionGroupPlayer[]>> = {
  all: {
    D: [
      { number: 66, shortName: "Jardel", x: 0.27, y: 0.59 },
      { number: 11, shortName: "Toha", x: 0.85, y: 0.57 },
      { number: 5, shortName: "Kozubaev", x: 0.43, y: 0.68 },
    ],
    M: [
      { number: 8, shortName: "Ganet", x: 0.42, y: 0.49 },
      { number: 33, shortName: "Bae", x: 0.52, y: 0.54 },
      { number: 19, shortName: "Guseynov", x: 0.61, y: 0.65 },
      { number: 7, shortName: "Rodriguez", x: 0.3, y: 0.4 },
      { number: 10, shortName: "Bessa", x: 0.48, y: 0.37 },
      { number: 80, shortName: "Caraka", x: 0.71, y: 0.38 },
    ],
    F: [{ number: 93, shortName: "Andrejić", x: 0.47, y: 0.33 }],
  },
  // Overlapping 93/10 labels + #33 Bae screenshot — actually "Win".
  win: {
    D: [
      { number: 66, shortName: "Jardel", x: 0.36, y: 0.61 },
      { number: 11, shortName: "Toha", x: 0.85, y: 0.58 },
      { number: 5, shortName: "Kozubaev", x: 0.38, y: 0.72 },
    ],
    // Andrejić and Bessa's labels overlap in the source screenshot (near-
    // identical average position that game) — kept as two separate points
    // at essentially the same spot rather than guessing which one is off.
    M: [
      { number: 8, shortName: "Ganet", x: 0.42, y: 0.49 },
      { number: 33, shortName: "Bae", x: 0.49, y: 0.56 },
      { number: 19, shortName: "Guseynov", x: 0.61, y: 0.66 },
      { number: 7, shortName: "Rodriguez", x: 0.28, y: 0.41 },
      { number: 80, shortName: "Caraka", x: 0.74, y: 0.43 },
      { number: 10, shortName: "Bessa", x: 0.48, y: 0.36 },
    ],
    F: [{ number: 93, shortName: "Andrejić", x: 0.48, y: 0.36 }],
  },
  // #77 Alves screenshot — actually "Draw".
  draw: {
    D: [
      { number: 66, shortName: "Jardel", x: 0.16, y: 0.6 },
      { number: 11, shortName: "Toha", x: 0.88, y: 0.54 },
      { number: 5, shortName: "Kozubaev", x: 0.52, y: 0.65 },
    ],
    M: [
      { number: 8, shortName: "Ganet", x: 0.43, y: 0.51 },
      { number: 33, shortName: "Bae", x: 0.61, y: 0.54 },
      { number: 19, shortName: "Guseynov", x: 0.49, y: 0.61 },
      { number: 7, shortName: "Rodriguez", x: 0.28, y: 0.39 },
      { number: 80, shortName: "Caraka", x: 0.78, y: 0.37 },
    ],
    // Alves not in the roster export — likely a striker used sparingly,
    // positioned very high up the pitch in the reference screenshot.
    F: [
      { number: 93, shortName: "Andrejić", x: 0.52, y: 0.32 },
      { number: 77, shortName: "Alves", x: 0.5, y: 0.17 },
    ],
  },
  // #20 Bueno screenshot — actually "Loss".
  loss: {
    D: [
      { number: 66, shortName: "Jardel", x: 0.26, y: 0.58 },
      { number: 11, shortName: "Toha", x: 0.84, y: 0.56 },
      { number: 5, shortName: "Kozubaev", x: 0.43, y: 0.66 },
    ],
    // Bueno not in the roster export — a defensive midfielder per Nexus data.
    M: [
      { number: 8, shortName: "Ganet", x: 0.41, y: 0.49 },
      { number: 7, shortName: "Rodriguez", x: 0.32, y: 0.39 },
      { number: 80, shortName: "Caraka", x: 0.66, y: 0.35 },
      { number: 10, shortName: "Bessa", x: 0.49, y: 0.4 },
      { number: 19, shortName: "Guseynov", x: 0.67, y: 0.65 },
      { number: 20, shortName: "Bueno", x: 0.54, y: 0.56 },
    ],
    F: [{ number: 93, shortName: "Andrejić", x: 0.43, y: 0.32 }],
  },
};

export const ROSTER_BY_TEAM: Record<string, Record<RosterFilter, RosterPlayer[]>> = {
  "Bhayangkara Presisi FC": BHAYANGKARA_ROSTER,
  "Persita Tangerang": PERSITA_ROSTER,
};

export const POSITION_GROUP_MAPS_BY_TEAM: Record<string, Record<RosterFilter, Record<PositionGroup, PositionGroupPlayer[]>>> = {
  "Bhayangkara Presisi FC": BHAYANGKARA_POSITION_GROUP_MAPS,
  "Persita Tangerang": PERSITA_POSITION_GROUP_MAPS,
};
