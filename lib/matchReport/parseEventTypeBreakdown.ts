// lib/matchReport/parseEventTypeBreakdown.ts
// The Losses and Recoveries pages each carry a small team-level breakdown
// table (next to the per-player list) categorizing every loss/recovery by
// how it happened — e.g. Losses: Forward pass / Lateral or back pass /
// Ground duel / Other. This is separate from the per-event scatter diagram
// (parseEventScatterPage.ts), which only has position, not category.
import type { TextItem } from "../pdf/textLayout";

const LOSS_LABELS: [string, string][] = [
  ["Forward pass", "losses_type_forward_pass"],
  ["Lateral or back pass", "losses_type_lateral_or_back_pass"],
  ["Ground duel", "losses_type_ground_duel"],
  ["Other", "losses_type_other"],
];

const RECOVERY_LABELS: [string, string][] = [
  ["Positioning", "recoveries_type_positioning"],
  ["Interception", "recoveries_type_interception"],
  ["Aerial duel", "recoveries_type_aerial_duel"],
  ["Ground duel", "recoveries_type_ground_duel"],
];

/**
 * The page stacks one team's whole section (player list + type table) above
 * the other's, same convention as the event-diagram boxes — resolved by
 * proximity to each team's own name label rather than assuming home is
 * always on top.
 */
function splitByTeamSection(items: TextItem[], homeTeamName: string | null, awayTeamName: string | null): { home: TextItem[]; away: TextItem[] } {
  const homeLabel = homeTeamName ? items.find((it) => it.str === homeTeamName) : undefined;
  const awayLabel = awayTeamName ? items.find((it) => it.str === awayTeamName) : undefined;
  if (!homeLabel || !awayLabel) return { home: items, away: [] };

  const lowerY = Math.min(homeLabel.y, awayLabel.y);
  const upperIsHome = homeLabel.y > awayLabel.y;
  const upperSection = items.filter((it) => it.y >= lowerY);
  const lowerSection = items.filter((it) => it.y < lowerY);
  return upperIsHome ? { home: upperSection, away: lowerSection } : { home: lowerSection, away: upperSection };
}

/** Each category label sits on its own row with the count as the next number to its right. */
function parseTypeBreakdown(items: TextItem[], labels: [string, string][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, key] of labels) {
    const labelItem = items.find((it) => it.str === label);
    if (!labelItem) continue;
    const countItem = items.filter((it) => Math.abs(it.y - labelItem.y) <= 3 && it.x > labelItem.x && /^\d+$/.test(it.str)).sort((a, b) => a.x - b.x)[0];
    if (countItem) out[key] = countItem.str;
  }
  return out;
}

export function parseLossesTypeBreakdown(items: TextItem[], homeTeamName: string | null, awayTeamName: string | null): { home: Record<string, string>; away: Record<string, string> } {
  const { home, away } = splitByTeamSection(items, homeTeamName, awayTeamName);
  return { home: parseTypeBreakdown(home, LOSS_LABELS), away: parseTypeBreakdown(away, LOSS_LABELS) };
}

export function parseRecoveriesTypeBreakdown(items: TextItem[], homeTeamName: string | null, awayTeamName: string | null): { home: Record<string, string>; away: Record<string, string> } {
  const { home, away } = splitByTeamSection(items, homeTeamName, awayTeamName);
  return { home: parseTypeBreakdown(home, RECOVERY_LABELS), away: parseTypeBreakdown(away, RECOVERY_LABELS) };
}
