// lib/scouting/passNetwork.ts
// Per-match pass network for a team's starting XI, transcribed from Lapangbola
// match report "Passing Matrix" pages. Only starter-to-starter passes are
// included (substitutes dropped) — standard practice for a pass network
// chart, and it avoids guessing where a substitute's average position sits.

export interface PassNetworkPlayer {
  number: number;
  name: string;
  x: number; // fractional pitch position, 0 (own goal) - 1 (attacking end)
  y: number; // fractional pitch width, 0 - 1
}

export interface PassNetworkPass {
  from: number; // passer's player number
  to: number; // receiver's player number
  count: number;
}

export interface PassNetworkMatch {
  label: string; // e.g. "vs PSS Sleman (A) — Sep 12, 2026"
  players: PassNetworkPlayer[];
  // Directed passer -> receiver counts, transcribed straight from the PDF's
  // own Passing Matrix table (only non-zero cells). The network diagram
  // combines each pair's two directions into one line at render time.
  passes: PassNetworkPass[];
}

export interface PassNetworkEdge {
  a: number;
  b: number;
  count: number; // combined passes both directions between a and b
}

/** Collapses directed passer->receiver counts into one undirected line per pair, for the network diagram. */
export function combinedEdges(match: PassNetworkMatch): PassNetworkEdge[] {
  const map = new Map<string, PassNetworkEdge>();
  for (const p of match.passes) {
    const [a, b] = p.from < p.to ? [p.from, p.to] : [p.to, p.from];
    const key = `${a}-${b}`;
    const existing = map.get(key);
    if (existing) existing.count += p.count;
    else map.set(key, { a, b, count: p.count });
  }
  return Array.from(map.values());
}

const MADURA_VS_PSS: PassNetworkMatch = {
  label: "vs PSS Sleman (A) — Sep 12, 2026",
  players: [
    { number: 1, name: "Angga Saputro", x: 0.06, y: 0.5 },
    { number: 3, name: "Pedro Monteiro", x: 0.2, y: 0.4 },
    { number: 68, name: "Ahmad Rusadi", x: 0.2, y: 0.6 },
    { number: 33, name: "Ardi Idrus", x: 0.24, y: 0.12 },
    { number: 29, name: "Dede Sapari", x: 0.24, y: 0.88 },
    { number: 36, name: "Ilham Syah", x: 0.42, y: 0.35 },
    { number: 23, name: "Hugo Gomes", x: 0.42, y: 0.65 },
    { number: 8, name: "Danilo Santacruz", x: 0.6, y: 0.5 },
    { number: 10, name: "Iran Junior", x: 0.8, y: 0.3 },
    { number: 21, name: "Gali Freitas", x: 0.8, y: 0.7 },
    { number: 9, name: "Dimitar Georgiev Mitkov", x: 0.9, y: 0.5 },
  ],
  passes: [
    { from: 1, to: 68, count: 5 },
    { from: 1, to: 3, count: 3 },
    { from: 1, to: 33, count: 1 },
    { from: 1, to: 29, count: 1 },
    { from: 1, to: 23, count: 3 },
    { from: 1, to: 8, count: 1 },
    { from: 1, to: 21, count: 1 },
    { from: 1, to: 9, count: 2 },
    { from: 68, to: 1, count: 3 },
    { from: 68, to: 3, count: 6 },
    { from: 68, to: 33, count: 4 },
    { from: 68, to: 36, count: 1 },
    { from: 68, to: 23, count: 10 },
    { from: 68, to: 8, count: 1 },
    { from: 68, to: 21, count: 1 },
    { from: 68, to: 9, count: 1 },
    { from: 3, to: 1, count: 1 },
    { from: 3, to: 68, count: 4 },
    { from: 3, to: 33, count: 1 },
    { from: 3, to: 29, count: 2 },
    { from: 3, to: 36, count: 1 },
    { from: 3, to: 23, count: 2 },
    { from: 3, to: 8, count: 1 },
    { from: 3, to: 21, count: 3 },
    { from: 3, to: 9, count: 2 },
    { from: 33, to: 1, count: 1 },
    { from: 33, to: 3, count: 1 },
    { from: 33, to: 29, count: 1 },
    { from: 33, to: 36, count: 2 },
    { from: 33, to: 23, count: 3 },
    { from: 33, to: 8, count: 2 },
    { from: 33, to: 10, count: 1 },
    { from: 33, to: 21, count: 1 },
    { from: 33, to: 9, count: 2 },
    { from: 29, to: 1, count: 1 },
    { from: 29, to: 68, count: 1 },
    { from: 29, to: 3, count: 2 },
    { from: 29, to: 23, count: 1 },
    { from: 29, to: 8, count: 1 },
    { from: 29, to: 21, count: 5 },
    { from: 29, to: 9, count: 3 },
    { from: 36, to: 68, count: 3 },
    { from: 36, to: 3, count: 1 },
    { from: 36, to: 29, count: 2 },
    { from: 36, to: 23, count: 3 },
    { from: 36, to: 8, count: 1 },
    { from: 36, to: 9, count: 2 },
    { from: 23, to: 68, count: 4 },
    { from: 23, to: 3, count: 6 },
    { from: 23, to: 33, count: 2 },
    { from: 23, to: 36, count: 3 },
    { from: 23, to: 8, count: 7 },
    { from: 23, to: 10, count: 2 },
    { from: 23, to: 21, count: 9 },
    { from: 23, to: 9, count: 1 },
    { from: 8, to: 68, count: 3 },
    { from: 8, to: 3, count: 1 },
    { from: 8, to: 33, count: 1 },
    { from: 8, to: 36, count: 2 },
    { from: 8, to: 23, count: 5 },
    { from: 8, to: 10, count: 3 },
    { from: 8, to: 21, count: 5 },
    { from: 8, to: 9, count: 2 },
    { from: 10, to: 1, count: 1 },
    { from: 10, to: 3, count: 1 },
    { from: 10, to: 33, count: 2 },
    { from: 10, to: 36, count: 2 },
    { from: 10, to: 23, count: 2 },
    { from: 10, to: 8, count: 3 },
    { from: 10, to: 21, count: 1 },
    { from: 10, to: 9, count: 1 },
    { from: 21, to: 68, count: 2 },
    { from: 21, to: 3, count: 2 },
    { from: 21, to: 33, count: 1 },
    { from: 21, to: 29, count: 3 },
    { from: 21, to: 36, count: 5 },
    { from: 21, to: 23, count: 4 },
    { from: 21, to: 8, count: 2 },
    { from: 21, to: 10, count: 2 },
    { from: 21, to: 9, count: 4 },
    { from: 9, to: 3, count: 3 },
    { from: 9, to: 29, count: 1 },
    { from: 9, to: 36, count: 1 },
    { from: 9, to: 8, count: 2 },
    { from: 9, to: 10, count: 1 },
    { from: 9, to: 21, count: 3 },
  ],
};

const MADURA_VS_PERSIJAP: PassNetworkMatch = {
  label: "vs Persijap Jepara (H) — Sep 6, 2026",
  players: [
    { number: 1, name: "Angga Saputro", x: 0.06, y: 0.5 },
    { number: 3, name: "Pedro Monteiro", x: 0.2, y: 0.4 },
    { number: 95, name: "Mendonça", x: 0.2, y: 0.6 },
    { number: 33, name: "Ardi Idrus", x: 0.24, y: 0.12 },
    { number: 15, name: "Giovani Numberi", x: 0.24, y: 0.88 },
    { number: 23, name: "Hugo Gomes", x: 0.42, y: 0.35 },
    { number: 36, name: "Ilham Syah", x: 0.42, y: 0.65 },
    { number: 8, name: "Danilo Santacruz", x: 0.6, y: 0.5 },
    { number: 10, name: "Iran Junior", x: 0.8, y: 0.3 },
    { number: 21, name: "Gali Freitas", x: 0.8, y: 0.7 },
    { number: 9, name: "Dimitar Georgiev Mitkov", x: 0.9, y: 0.5 },
  ],
  passes: [
    { from: 1, to: 95, count: 6 },
    { from: 1, to: 3, count: 10 },
    { from: 1, to: 15, count: 1 },
    { from: 1, to: 23, count: 1 },
    { from: 1, to: 36, count: 2 },
    { from: 1, to: 8, count: 1 },
    { from: 95, to: 1, count: 1 },
    { from: 95, to: 3, count: 16 },
    { from: 95, to: 33, count: 13 },
    { from: 95, to: 15, count: 2 },
    { from: 95, to: 23, count: 3 },
    { from: 95, to: 36, count: 6 },
    { from: 95, to: 8, count: 7 },
    { from: 95, to: 10, count: 5 },
    { from: 95, to: 21, count: 1 },
    { from: 95, to: 9, count: 2 },
    { from: 3, to: 1, count: 1 },
    { from: 3, to: 95, count: 19 },
    { from: 3, to: 33, count: 1 },
    { from: 3, to: 15, count: 12 },
    { from: 3, to: 23, count: 13 },
    { from: 3, to: 36, count: 9 },
    { from: 3, to: 8, count: 1 },
    { from: 3, to: 10, count: 3 },
    { from: 3, to: 21, count: 3 },
    { from: 3, to: 9, count: 1 },
    { from: 33, to: 1, count: 1 },
    { from: 33, to: 95, count: 11 },
    { from: 33, to: 3, count: 3 },
    { from: 33, to: 15, count: 1 },
    { from: 33, to: 23, count: 4 },
    { from: 33, to: 36, count: 2 },
    { from: 33, to: 8, count: 11 },
    { from: 33, to: 10, count: 3 },
    { from: 33, to: 21, count: 1 },
    { from: 33, to: 9, count: 1 },
    { from: 15, to: 1, count: 1 },
    { from: 15, to: 95, count: 2 },
    { from: 15, to: 3, count: 9 },
    { from: 15, to: 33, count: 1 },
    { from: 15, to: 23, count: 3 },
    { from: 15, to: 36, count: 1 },
    { from: 15, to: 8, count: 2 },
    { from: 15, to: 10, count: 6 },
    { from: 15, to: 21, count: 9 },
    { from: 15, to: 9, count: 2 },
    { from: 23, to: 95, count: 2 },
    { from: 23, to: 3, count: 10 },
    { from: 23, to: 33, count: 3 },
    { from: 23, to: 15, count: 10 },
    { from: 23, to: 36, count: 5 },
    { from: 23, to: 8, count: 6 },
    { from: 23, to: 10, count: 4 },
    { from: 23, to: 21, count: 4 },
    { from: 23, to: 9, count: 3 },
    { from: 36, to: 95, count: 10 },
    { from: 36, to: 3, count: 6 },
    { from: 36, to: 33, count: 4 },
    { from: 36, to: 15, count: 2 },
    { from: 36, to: 23, count: 4 },
    { from: 36, to: 8, count: 2 },
    { from: 36, to: 10, count: 2 },
    { from: 36, to: 21, count: 2 },
    { from: 36, to: 9, count: 2 },
    { from: 8, to: 95, count: 5 },
    { from: 8, to: 3, count: 1 },
    { from: 8, to: 33, count: 9 },
    { from: 8, to: 23, count: 6 },
    { from: 8, to: 36, count: 6 },
    { from: 8, to: 10, count: 4 },
    { from: 8, to: 21, count: 5 },
    { from: 8, to: 9, count: 1 },
    { from: 10, to: 1, count: 1 },
    { from: 10, to: 95, count: 4 },
    { from: 10, to: 3, count: 1 },
    { from: 10, to: 33, count: 4 },
    { from: 10, to: 15, count: 1 },
    { from: 10, to: 23, count: 6 },
    { from: 10, to: 36, count: 8 },
    { from: 10, to: 8, count: 2 },
    { from: 10, to: 21, count: 2 },
    { from: 10, to: 9, count: 3 },
    { from: 21, to: 95, count: 1 },
    { from: 21, to: 3, count: 2 },
    { from: 21, to: 33, count: 1 },
    { from: 21, to: 15, count: 5 },
    { from: 21, to: 23, count: 4 },
    { from: 21, to: 36, count: 1 },
    { from: 21, to: 8, count: 4 },
    { from: 21, to: 10, count: 3 },
    { from: 21, to: 9, count: 1 },
    { from: 9, to: 3, count: 1 },
    { from: 9, to: 33, count: 2 },
    { from: 9, to: 23, count: 3 },
  ],
};

/** Union of both matches' XIs (first-seen position wins for a slot two lineups share), passes summed. */
function overallMatch(matches: PassNetworkMatch[]): PassNetworkMatch {
  const players = new Map<number, PassNetworkPlayer>();
  for (const m of matches) for (const p of m.players) if (!players.has(p.number)) players.set(p.number, p);

  const passMap = new Map<string, PassNetworkPass>();
  for (const m of matches) {
    for (const p of m.passes) {
      const key = `${p.from}-${p.to}`;
      const existing = passMap.get(key);
      if (existing) existing.count += p.count;
      else passMap.set(key, { ...p });
    }
  }

  return {
    label: `Overall (${matches.length} matches)`,
    players: Array.from(players.values()),
    passes: Array.from(passMap.values()),
  };
}

const MADURA_MATCHES = [MADURA_VS_PSS, MADURA_VS_PERSIJAP];

export const PASS_NETWORK_BY_TEAM: Record<string, PassNetworkMatch[]> = {
  "Madura United FC": [overallMatch(MADURA_MATCHES), ...MADURA_MATCHES],
};
