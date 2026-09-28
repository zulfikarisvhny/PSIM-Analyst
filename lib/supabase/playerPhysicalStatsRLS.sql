-- Same gap as the other tables this session: RLS enabled with no policy, so
-- authenticated queries silently return zero rows (confirmed: anon select
-- came back empty even though the table has 40 rows from the Physical
-- Stats import). Needed now that the Match Report Browser reads this table
-- for the "PSIM Player Physical Stats" section.
alter table player_physical_stats enable row level security;
drop policy if exists "player_physical_stats_authenticated_all" on player_physical_stats;
create policy "player_physical_stats_authenticated_all" on player_physical_stats for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
