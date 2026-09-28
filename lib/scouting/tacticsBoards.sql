-- Run this once in the Supabase SQL editor (Project → SQL Editor) before
-- using the Tactics Board tab. Mirrors the open, no-auth RLS policy already
-- used by formation_lineups / formation_slot_positions in this project —
-- the app writes with the public anon key, so every policy allows all rows.

create table if not exists tactics_boards (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  title text not null default 'Untitled Board',
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tactics_boards_team_idx on tactics_boards (team);

alter table tactics_boards enable row level security;

create policy "tactics_boards_public_select" on tactics_boards for select using (true);
create policy "tactics_boards_public_insert" on tactics_boards for insert with check (true);
create policy "tactics_boards_public_update" on tactics_boards for update using (true);
create policy "tactics_boards_public_delete" on tactics_boards for delete using (true);
