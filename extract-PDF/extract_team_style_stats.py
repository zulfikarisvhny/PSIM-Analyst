"""
Extract Team Stats xlsx (Wyscout export, per-match team stats with 2 rows
per match: the team itself + opponent) and compute AVERAGED team_style_stats
metrics for one team across all its matches in the file.

Usage:
    python3 extract_team_style_stats.py "Team_Stats_XXX.xlsx" "Team Name" > output.sql

Computes (from raw match-level stats, averaged across matches):
    - possession_pct, direct_pct (Long pass %), pass_accuracy_pct
    - xg_per_shot, proactive_def_pct, step_out_pct, aerial_pct (tendency)
    - wins/draws/losses (derived from goals scored vs conceded per match)

NOT computed (columns not present in this export type):
    - kp_per_shot (needs "Key passes" column)
    - territory_pct (needs "passes in opponent half" column)
"""
import pandas as pd, re, sys


def slug(h):
    h = h.lower()
    return re.sub(r'[^a-z0-9]+', '_', h).strip('_')


def parse_team_rows(xlsx_path, team_name):
    df_raw = pd.read_excel(xlsx_path, header=None)
    header = df_raw.iloc[0].tolist()
    data_rows = df_raw.iloc[3:].reset_index(drop=True)  # skip the two stray label rows

    filled, last = [], None
    for h in header:
        if isinstance(h, str) and h.strip():
            last = h.strip()
        filled.append(last)

    groups, i = [], 0
    while i < len(filled):
        label = filled[i]
        j = i
        while j < len(filled) and filled[j] == label:
            j += 1
        groups.append((label, i, j - i))
        i = j

    team_rows = []
    for _, r in data_rows.iterrows():
        if r[4] != team_name:
            continue
        stats = {}
        for label, start, size in groups:
            if label in ('Date', 'Match', 'Competition', 'Duration', 'Team', 'Scheme'):
                continue
            if label == 'Possession, %':
                stats['possession_pct'] = r[start]
                continue
            base = slug(label)
            if size == 1:
                stats[base] = r[start]
            elif size == 3:
                stats[f"{base}_total"] = r[start]
                stats[f"{base}_success"] = r[start + 1]
                stats[f"{base}_pct"] = r[start + 2]
            elif size == 4:
                parts = [p.strip() for p in label.split(' / ')]
                stats[f"{slug(parts[0])}_total"] = r[start]
                for k, p in enumerate(parts[1:]):
                    stats[f"{slug(parts[0])}_{slug(p)}"] = r[start + 1 + k]
        team_rows.append(stats)
    return team_rows


def compute_averages(team_rows):
    def avg(key):
        vals = [row[key] for row in team_rows if key in row]
        return sum(vals) / len(vals) if vals else None

    avg_xg = avg('xg')
    avg_shots_total = avg('shots_on_target_total')
    avg_interceptions = avg('interceptions')
    avg_recoveries = avg('recoveries_total')
    avg_sliding_tackles = avg('sliding_tackles_successful_total')
    avg_clearances = avg('clearances')
    avg_aerial_total = avg('aerial_duels_won_total')
    avg_duels_total = avg('duels_won_total')

    wins = draws = losses = 0
    for row in team_rows:
        gf, ga = row.get('goals'), row.get('conceded_goals')
        if gf is None or ga is None:
            continue
        if gf > ga:
            wins += 1
        elif gf == ga:
            draws += 1
        else:
            losses += 1

    return {
        'matches_played': len(team_rows),
        'wins': wins, 'draws': draws, 'losses': losses,
        'possession_pct': avg('possession_pct'),
        'direct_pct': avg('long_pass'),
        'pass_accuracy_pct': avg('passes_accurate_pct'),
        'xg_per_shot': (avg_xg / avg_shots_total) if avg_shots_total else None,
        'proactive_def_pct': (100 * avg_interceptions / (avg_interceptions + avg_recoveries))
            if avg_interceptions is not None and avg_recoveries else None,
        'step_out_pct': (100 * avg_sliding_tackles / (avg_sliding_tackles + avg_clearances))
            if avg_sliding_tackles is not None and avg_clearances else None,
        'aerial_pct': (100 * avg_aerial_total / avg_duels_total)
            if avg_aerial_total is not None and avg_duels_total else None,
    }


def sql_num(v):
    return 'NULL' if v is None else f"{v:.3f}"


def generate_sql(team_name, m):
    return f"""insert into team_style_stats (club_id, season, as_of, matches_played, wins, draws, losses, possession_pct, direct_pct, pass_accuracy_pct, xg_per_shot, proactive_def_pct, step_out_pct, aerial_pct)
select c.id, '2026/2027', current_date, {m['matches_played']}, {m['wins']}, {m['draws']}, {m['losses']},
  {sql_num(m['possession_pct'])}, {sql_num(m['direct_pct'])}, {sql_num(m['pass_accuracy_pct'])},
  {sql_num(m['xg_per_shot'])}, {sql_num(m['proactive_def_pct'])}, {sql_num(m['step_out_pct'])}, {sql_num(m['aerial_pct'])}
from clubs c where c.name = '{team_name}'
on conflict (club_id, season, matches_played) do update set
  as_of = excluded.as_of, wins = excluded.wins, draws = excluded.draws, losses = excluded.losses,
  possession_pct = excluded.possession_pct, direct_pct = excluded.direct_pct,
  pass_accuracy_pct = excluded.pass_accuracy_pct, xg_per_shot = excluded.xg_per_shot,
  proactive_def_pct = excluded.proactive_def_pct, step_out_pct = excluded.step_out_pct,
  aerial_pct = excluded.aerial_pct;"""


if __name__ == '__main__':
    xlsx_path, team_name = sys.argv[1], sys.argv[2]
    rows = parse_team_rows(xlsx_path, team_name)
    if not rows:
        print(f"-- No rows found for team '{team_name}' in {xlsx_path}", file=sys.stderr)
        sys.exit(1)
    metrics = compute_averages(rows)
    print(f"-- {team_name}: {metrics}", file=sys.stderr)
    print(generate_sql(team_name, metrics))
