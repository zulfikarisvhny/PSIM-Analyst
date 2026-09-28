"""
Extract match metadata + Team Stats from a Wyscout/Hudl "MATCH REPORT" PDF
and either print ready-to-run SQL, or insert straight into Supabase.

Usage:
    python3 extract_match_report.py path/to/report.pdf            # prints extracted JSON
    python3 extract_match_report.py path/to/report.pdf --sql       # prints SQL (old behaviour)
    python3 extract_match_report.py path/to/report.pdf --db        # inserts into Supabase directly
    python3 extract_match_report.py gw1.pdf gw2.pdf gw3.pdf --db   # several PDFs in one run

--db reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from a .env file next to this
script (service_role, not anon — inserts need to bypass RLS). Safe to re-run: clubs
are upserted by name, matches are looked up by (home, away, date) before inserting
so a repeat run updates the existing row instead of duplicating it, and
team_match_stats upserts on (match_label, club_id) same as before.

Covers reliably (clean text tables):
    - Match metadata (teams, score, date, competition, round)  -> page 1
    - Team Stats (both teams, ~55 metrics)                      -> auto-detected page

Does NOT cover (chart-based pages, still need manual/image reading):
    - Match Dynamics (15-min interval breakdown)
    - Passing network matrix
    - Shots map coordinates
"""
import pdfplumber, re, sys, json, os

TEAM_STATS_LABELS = [
    "Goals","xG","Shots / on target","Shots on post / blocked / wide",
    "From penalty area / on target","Outside penalty area / on target",
    "Average shot distance (m)","Corners","Free kicks","Offsides",
    "Fouls / suffered","Yellow / red cards",
    "Total / with shots","Positional attacks / with shots","Counterattacks",
    "Free kicks / with shots","Corners / with shots",
    "Sliding tackles","Interceptions","Clearances","Passes allowed per def. action (PPDA)",
    "Recoveries / low / medium / high","Opponent half recoveries","Losses / low / medium / high",
    "Total duels / won","Offensive duels / won","Defensive duels / won","Loose ball duels / won",
    "Aerial duels / won","Challenge intensity","Dribbles / successful",
    "Possession %","Pure possession time","Number of possessions",
    "Possessions reaching opponent half","Possessions reaching opponent penalty area",
    "Average possession duration","Dead time",
    "Total passes / accurate","Forward passes / accurate","Back passes / accurate",
    "Lateral passes / accurate","Progressive passes / accurate","Long passes / accurate",
    "Passes to final third / accurate","Average pass to final third length (m)",
    "Passes to penalty area / accurate","Smart passes / accurate","Shot assists",
    "Through passes / accurate","Crosses / accurate","Crosses: low / high / blocked",
    "Deep completions","Match tempo","Average pass length (m)",
]
TEAM_STATS_LABELS.sort(key=len, reverse=True)


def slug(h):
    h = h.lower()
    h = re.sub(r'[^a-z0-9]+', '_', h).strip('_')
    return h


def parse_metadata(pdf):
    page = pdf.pages[0]
    text = page.extract_text()
    m_score = re.search(r'(\d+)\s*[–-]\s*(\d+)', text)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    date_line = next((l for l in lines if re.match(r'\d{2}/\d{2}/\d{4}', l)), '')
    date_m = re.match(r'(\d{2}/\d{2}/\d{4})\s+(.+?)\s+(Round\s*\d+)', date_line)

    # team names via left/right word position split (same trick as team stats columns)
    mid_x = page.width / 2
    words = page.extract_words()
    tops = sorted(set(round(w['top']) for w in words))
    score_tops = [t for t in tops if any(round(w['top']) == t and re.match(r'^[–-]$', w['text']) for w in words)]
    home_team = away_team = None
    if score_tops:
        score_top = score_tops[0]
        later_tops = [t for t in tops if t > score_top]
        if later_tops:
            name_top = later_tops[0]
            name_words = [w for w in words if abs(round(w['top']) - name_top) <= 2]
            left_words = sorted([w for w in name_words if w['x0'] < mid_x], key=lambda w: w['x0'])
            right_words = sorted([w for w in name_words if w['x0'] >= mid_x], key=lambda w: w['x0'])
            home_team = ' '.join(w['text'] for w in left_words) or None
            away_team = ' '.join(w['text'] for w in right_words) or None

    return {
        'home_team': home_team,
        'away_team': away_team,
        'home_score': int(m_score.group(1)) if m_score else None,
        'away_score': int(m_score.group(2)) if m_score else None,
        'match_date': date_m.group(1) if date_m else None,
        'competition': date_m.group(2) if date_m else None,
        'round': date_m.group(3) if date_m else None,
    }


def words_to_lines(words):
    lines = {}
    for w in words:
        key = round(w['top'])
        lines.setdefault(key, []).append(w)
    sorted_tops = sorted(lines.keys())
    merged, used = [], set()
    for t in sorted_tops:
        if t in used:
            continue
        group = list(lines[t])
        for t2 in sorted_tops:
            if t2 != t and abs(t2 - t) <= 2 and t2 not in used:
                group.extend(lines[t2])
                used.add(t2)
        used.add(t)
        group.sort(key=lambda w: w['x0'])
        merged.append(' '.join(w['text'] for w in group))
    return merged


def find_team_stats_page(pdf):
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        if 'TEAM STATS' in text.upper():
            return i
    return None


def parse_team_stats(pdf, page_index):
    page = pdf.pages[page_index]
    mid_x = page.width / 2
    words = page.extract_words()
    left = words_to_lines([w for w in words if w['x0'] < mid_x])
    right = words_to_lines([w for w in words if w['x0'] >= mid_x])
    result = {}
    for line in left + right:
        for label in TEAM_STATS_LABELS:
            if line.startswith(label):
                rest = line[len(label):].strip()
                tokens = rest.split()
                half = len(tokens) // 2
                result[label] = (' '.join(tokens[:half]), ' '.join(tokens[half:]))
                break
    return result


def to_stats_json(team_stats, side):
    """side: 0 for home column, 1 for away column"""
    out = {}
    for label, (home, away) in team_stats.items():
        val = home if side == 0 else away
        out[slug(label)] = val
    return out


def extract(pdf_path):
    pdf = pdfplumber.open(pdf_path)
    meta = parse_metadata(pdf)
    ts_page = find_team_stats_page(pdf)
    team_stats = parse_team_stats(pdf, ts_page) if ts_page is not None else {}
    return {
        'metadata': meta,
        'team_stats_home': to_stats_json(team_stats, 0),
        'team_stats_away': to_stats_json(team_stats, 1),
        'raw_team_stats': team_stats,
    }


def sql_str(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def iso_date(meta):
    if not meta.get('match_date'):
        return None
    d, m, y = meta['match_date'].split('/')
    return f"{y}-{m}-{d}"


def generate_sql(data):
    meta = data['metadata']
    lines = []
    lines.append("-- Auto-extracted from match report PDF")
    lines.append("insert into clubs (name) values")
    lines.append(f"  ({sql_str(meta['home_team'])}), ({sql_str(meta['away_team'])})")
    lines.append("on conflict (name) do nothing;")
    lines.append("")
    lines.append("insert into matches (home_club_id, away_club_id, match_date, competition, round, home_score, away_score)")
    lines.append("select (select id from clubs where name = " + sql_str(meta['home_team']) + "),")
    lines.append("       (select id from clubs where name = " + sql_str(meta['away_team']) + "),")
    date_iso = iso_date(meta)
    lines.append(f"       {sql_str(date_iso)}::date, {sql_str(meta['competition'])}, {sql_str(meta['round'])}, "
                 f"{meta['home_score']}, {meta['away_score']}")
    lines.append("returning id;")
    lines.append("")
    lines.append("-- Team stats (join to the matches row above by match_date + club name)")
    for side_label, team_name, stats in [('home', meta['home_team'], data['team_stats_home']),
                                           ('away', meta['away_team'], data['team_stats_away'])]:
        stats_json = json.dumps(stats, ensure_ascii=False)
        lines.append(
            f"insert into team_match_stats (match_label, match_date, competition, club_id, goals, xg, possession_pct, stats)\n"
            f"select {sql_str(meta['home_team'] + ' vs ' + meta['away_team'])}, {sql_str(date_iso)}::date, "
            f"{sql_str(meta['competition'])}, c.id, {stats.get('goals')}, {stats.get('xg')}, "
            f"{stats.get('possession_pct') or stats.get('possession')}, {sql_str(stats_json)}::jsonb\n"
            f"from clubs c where c.name = {sql_str(team_name)}\n"
            f"on conflict (match_label, club_id) do update set stats = excluded.stats;"
        )
        lines.append("")
    return "\n".join(lines)


def parse_number(v):
    """'2' -> 2, '2.49' -> 2.49, '' or None -> None."""
    if v is None or v == '':
        return None
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return None


def get_supabase():
    from dotenv import load_dotenv
    from supabase import create_client
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
    url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    return create_client(url, key)


def insert_to_db(data, supabase):
    """Upserts clubs, finds-or-inserts the match, upserts both sides' team_match_stats. Safe to re-run."""
    meta = data['metadata']
    home, away = meta['home_team'], meta['away_team']
    date_iso = iso_date(meta)
    if not home or not away:
        raise ValueError(f"Could not read team names from this PDF (home={home!r}, away={away!r})")

    for name in (home, away):
        supabase.table('clubs').upsert({'name': name}, on_conflict='name').execute()

    club_rows = supabase.table('clubs').select('id, name').in_('name', [home, away]).execute().data
    club_id_by_name = {c['name']: c['id'] for c in club_rows}
    home_id, away_id = club_id_by_name[home], club_id_by_name[away]

    existing = (
        supabase.table('matches')
        .select('id')
        .eq('home_club_id', home_id)
        .eq('away_club_id', away_id)
        .eq('match_date', date_iso)
        .execute()
        .data
    )
    match_row = {
        'home_club_id': home_id,
        'away_club_id': away_id,
        'match_date': date_iso,
        'competition': meta['competition'],
        'round': meta['round'],
        'home_score': meta['home_score'],
        'away_score': meta['away_score'],
    }
    if existing:
        match_id = existing[0]['id']
        supabase.table('matches').update(match_row).eq('id', match_id).execute()
        print(f"  matches: updated existing row (id={match_id})")
    else:
        inserted = supabase.table('matches').insert(match_row).execute().data
        match_id = inserted[0]['id']
        print(f"  matches: inserted new row (id={match_id})")

    match_label = f"{home} vs {away}"
    for team_name, stats in [(home, data['team_stats_home']), (away, data['team_stats_away'])]:
        row = {
            'match_label': match_label,
            'match_date': date_iso,
            'competition': meta['competition'],
            'club_id': club_id_by_name[team_name],
            'goals': parse_number(stats.get('goals')),
            'xg': parse_number(stats.get('xg')),
            'possession_pct': parse_number(stats.get('possession_pct') or stats.get('possession')),
            'stats': stats,
        }
        supabase.table('team_match_stats').upsert(row, on_conflict='match_label,club_id').execute()
        print(f"  team_match_stats: upserted {team_name}")

    return match_id


if __name__ == '__main__':
    paths = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not paths:
        print("Usage: python3 extract_match_report.py file1.pdf [file2.pdf ...] [--sql|--db]")
        sys.exit(1)

    if '--db' in sys.argv:
        supabase = get_supabase()
        for path in paths:
            print(f"{path}:")
            data = extract(path)
            try:
                insert_to_db(data, supabase)
            except Exception as e:
                print(f"  FAILED: {e}")
        sys.exit(0)

    for path in paths:
        data = extract(path)
        if '--sql' in sys.argv:
            print(generate_sql(data))
        else:
            print(json.dumps(data, indent=2, ensure_ascii=False))
