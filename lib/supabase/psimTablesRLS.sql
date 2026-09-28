-- Enables RLS and grants full read/write to any logged-in staff member
-- (the "authenticated" role) on the PSIM Yogyakarta project's data tables.
-- Anonymous (logged-out) requests get nothing — matches the "whole app
-- requires login" decision behind the middleware.
--
-- Run this once per table that exists in your project. If a table listed
-- here doesn't exist yet, its block will error — just skip/remove that
-- block and re-run the rest.

-- clubs
alter table clubs enable row level security;
create policy "clubs_authenticated_all" on clubs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- players
alter table players enable row level security;
create policy "players_authenticated_all" on players for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- player_season_stats
alter table player_season_stats enable row level security;
create policy "player_season_stats_authenticated_all" on player_season_stats for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- matches
alter table matches enable row level security;
create policy "matches_authenticated_all" on matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- match_pass_combinations
alter table match_pass_combinations enable row level security;
create policy "match_pass_combinations_authenticated_all" on match_pass_combinations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- match_passing_summary
alter table match_passing_summary enable row level security;
create policy "match_passing_summary_authenticated_all" on match_passing_summary for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
