alter table last_season_match_stats enable row level security;
create policy "last_season_match_stats_authenticated_all" on last_season_match_stats for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
