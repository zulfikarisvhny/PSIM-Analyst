-- Same gap as the other match_* tables this session: RLS enabled with no
-- policy, so authenticated queries silently return zero rows. These two
-- blocks are already in lib/supabase/psimTablesRLS.sql, pulled out here on
-- their own since the other blocks in that file (clubs, players, matches,
-- player_season_stats) were already run and would error as "policy already
-- exists" if run again.
alter table match_pass_combinations enable row level security;
drop policy if exists "match_pass_combinations_authenticated_all" on match_pass_combinations;
create policy "match_pass_combinations_authenticated_all" on match_pass_combinations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

alter table match_passing_summary enable row level security;
drop policy if exists "match_passing_summary_authenticated_all" on match_passing_summary;
create policy "match_passing_summary_authenticated_all" on match_passing_summary for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
