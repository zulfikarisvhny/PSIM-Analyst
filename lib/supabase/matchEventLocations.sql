-- One row per located event (shot / loss / recovery / key pass / cross),
-- pulled from the match report PDF's own location diagrams. A single table
-- with a `kind` discriminator rather than 5 tables, since every kind shares
-- the same core shape (who, where, which half) and only a few columns are
-- kind-specific (shots carry xg/psxg/shot_type/outcome; losses carry
-- leads_to_shot).
create table if not exists match_event_locations (
  id bigint generated always as identity primary key,
  match_id bigint not null references matches(id) on delete cascade,
  club_id bigint not null references clubs(id) on delete cascade,
  player_id bigint references players(id),
  player_name_raw text not null,
  jersey_number int,
  kind text not null check (kind in ('shot', 'loss', 'recovery', 'key_pass', 'cross')),
  half text check (half in ('1st', '2nd')), -- null for shots, which aren't split by half
  minute text, -- shots only
  shot_type text, -- shots only, e.g. "Right foot", "Head, after corner"
  outcome text check (outcome in ('goal', 'on_target', 'blocked', 'wide')), -- shots only
  xg numeric,
  psxg numeric,
  leads_to_shot boolean, -- losses only
  x_pct numeric not null, -- 0-100, that team's own attack direction (own goal = 0, opponent goal = 100)
  y_pct numeric not null, -- 0-100, touchline to touchline
  created_at timestamptz not null default now()
);

create index if not exists match_event_locations_match_kind_idx on match_event_locations (match_id, kind);

alter table match_event_locations enable row level security;
create policy "match_event_locations_authenticated_all" on match_event_locations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
