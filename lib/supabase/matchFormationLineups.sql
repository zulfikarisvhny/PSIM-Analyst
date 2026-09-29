-- Real per-phase formation-slot positions, read straight off the POSITIONS
-- page's own small formation diagrams (not the average-position dots) — one
-- row per player per phase, for exactly two phases per side: 'starting'
-- (earliest kickoff phase) and 'final' (whatever was on the pitch at the
-- final whistle, after every sub/reshuffle).
create table if not exists match_formation_lineups (
  id bigint generated always as identity primary key,
  match_id bigint not null references matches(id) on delete cascade,
  club_id bigint not null references clubs(id) on delete cascade,
  player_id bigint references players(id),
  player_name_raw text not null,
  jersey_number int not null,
  phase text not null check (phase in ('starting', 'final')),
  x_pct numeric not null,
  y_pct numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists match_formation_lineups_match_idx on match_formation_lineups (match_id, phase);

alter table match_formation_lineups enable row level security;
create policy "match_formation_lineups_authenticated_all" on match_formation_lineups for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
