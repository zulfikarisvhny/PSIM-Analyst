"""
Extract a Wyscout player search export (like GW2.xlsx, GW3.xlsx, ...) and
generate SQL to upsert clubs, players, and player_season_stats.

Usage:
    python3 extract_player_stats.py GW3.xlsx "2026/2027" "Liga 1" > gw3_import.sql

Safe to re-run: clubs/players/player_season_stats all upsert on conflict,
so running this every gameweek just updates existing rows with fresh numbers.
"""
import pandas as pd, re, json, sys

core_field_names = {
    'Player', 'Team', 'Position', 'Age', 'Market value', 'Contract expires',
    'Matches played', 'Minutes played', 'Goals', 'xG', 'Assists', 'xA',
    'Team within selected timeframe'
}


def slug(h):
    h = h.lower().replace('%', 'pct').replace('/', ' ').replace(',', '')
    return re.sub(r'[^a-z0-9]+', '_', h).strip('_')


def position_group(pos):
    if not isinstance(pos, str) or not pos:
        return None
    first = pos.split(',')[0].strip().upper()
    if first == 'GK':
        return 'GK'
    if any(k in first for k in ['CB', 'RB', 'LB', 'WB', 'DF']):
        return 'DF'
    if any(k in first for k in ['DMF', 'CMF', 'AMF', 'MF']):
        return 'MF'
    if any(k in first for k in ['W', 'CF', 'ST', 'FW']):
        return 'FW'
    return None


def sql_str(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def sql_num(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return 'NULL'
    return str(v)


def build_sql(xlsx_path, season, competition):
    df = pd.read_excel(xlsx_path)
    headers = list(df.columns)
    clubs = sorted(df['Team within selected timeframe'].dropna().unique().tolist())

    lines = []
    lines.append(f"-- Auto-generated from {xlsx_path} -- season {season}, competition {competition}")
    lines.append("")

    # safety: constraints (idempotent, harmless if they already exist)
    lines.append("do $$")
    lines.append("begin")
    lines.append("  if not exists (select 1 from pg_constraint where conname = 'players_name_club_unique') then")
    lines.append("    alter table players add constraint players_name_club_unique unique (name, club_id);")
    lines.append("  end if;")
    lines.append("end $$;")
    lines.append("")

    # 1) clubs
    lines.append("insert into clubs (name) values")
    lines.append(",\n".join(f"  ({sql_str(c)})" for c in clubs))
    lines.append("on conflict (name) do nothing;")
    lines.append("")

    # 2) players (upsert)
    lines.append("insert into players (club_id, name, position, position_group, nationality, preferred_foot, age, status)")
    lines.append("select c.id, v.name, v.position, v.position_group, v.nationality, v.preferred_foot, v.age, 'active'")
    lines.append("from (values")
    player_rows = []
    for _, r in df.iterrows():
        player_rows.append(
            f"  ({sql_str(r['Player'])}, {sql_str(r['Team within selected timeframe'])}, "
            f"{sql_str(r['Position'])}, {sql_str(position_group(r['Position']))}, "
            f"{sql_str(r.get('Passport country'))}, {sql_str(r.get('Foot'))}, {sql_num(r.get('Age'))})"
        )
    lines.append(",\n".join(player_rows))
    lines.append(") as v(name, club_name, position, position_group, nationality, preferred_foot, age)")
    lines.append("join clubs c on c.name = v.club_name")
    lines.append("on conflict (name, club_id) do update set")
    lines.append("  position = excluded.position, position_group = excluded.position_group,")
    lines.append("  nationality = excluded.nationality, preferred_foot = excluded.preferred_foot,")
    lines.append("  age = excluded.age, status = 'active';")
    lines.append("")

    # 3) player_season_stats
    lines.append(f"insert into player_season_stats (player_id, club_id, season, competition, position, age, market_value, contract_expires, matches_played, minutes_played, goals, xg, assists, xa, stats)")
    lines.append("select p.id, c.id, v.season, v.competition, v.position, v.age, v.market_value, v.contract_expires::date, v.matches_played, v.minutes_played, v.goals, v.xg, v.assists, v.xa, v.stats::jsonb")
    lines.append("from (values")
    stat_rows = []
    for _, r in df.iterrows():
        stats, seen = {}, {}
        for h in headers:
            if h in core_field_names:
                continue
            key = slug(h)
            if key in seen:
                seen[key] += 1
                key = f"{key}_{seen[key]}"
            else:
                seen[key] = 1
            val = r[h]
            if pd.isna(val):
                stats[key] = None
            elif isinstance(val, (int,)):
                stats[key] = int(val)
            elif isinstance(val, float):
                stats[key] = val
            else:
                stats[key] = str(val)
        stats_json = json.dumps(stats, ensure_ascii=False)
        contract = r['Contract expires']
        stat_rows.append(
            f"  ({sql_str(r['Player'])}, {sql_str(r['Team within selected timeframe'])}, {sql_str(season)}, {sql_str(competition)}, "
            f"{sql_str(r['Position'])}, {sql_num(r.get('Age'))}, {sql_num(r.get('Market value'))}, "
            f"{sql_str(contract) if not pd.isna(contract) else 'NULL'}, {sql_num(r.get('Matches played'))}, "
            f"{sql_num(r.get('Minutes played'))}, {sql_num(r.get('Goals'))}, {sql_num(r.get('xG'))}, "
            f"{sql_num(r.get('Assists'))}, {sql_num(r.get('xA'))}, {sql_str(stats_json)})"
        )
    lines.append(",\n".join(stat_rows))
    lines.append(") as v(name, club_name, season, competition, position, age, market_value, contract_expires, matches_played, minutes_played, goals, xg, assists, xa, stats)")
    lines.append("join clubs c on c.name = v.club_name")
    lines.append("join players p on p.name = v.name and p.club_id = c.id")
    lines.append("on conflict (player_id, season, competition) do update set")
    lines.append("  position = excluded.position, age = excluded.age, market_value = excluded.market_value,")
    lines.append("  contract_expires = excluded.contract_expires, matches_played = excluded.matches_played,")
    lines.append("  minutes_played = excluded.minutes_played, goals = excluded.goals, xg = excluded.xg,")
    lines.append("  assists = excluded.assists, xa = excluded.xa, stats = excluded.stats;")

    return "\n".join(lines)


if __name__ == '__main__':
    xlsx_path = sys.argv[1]
    season = sys.argv[2] if len(sys.argv) > 2 else '2026/2027'
    competition = sys.argv[3] if len(sys.argv) > 3 else 'Liga 1'
    print(build_sql(xlsx_path, season, competition))
