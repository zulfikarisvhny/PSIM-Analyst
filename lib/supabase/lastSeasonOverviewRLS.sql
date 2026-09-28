-- Same gap as team_style_stats/team_match_stats: RLS enabled with no policy
-- attached, so authenticated queries silently return zero rows.
alter table last_season_overview enable row level security;
create policy "last_season_overview_authenticated_all" on last_season_overview for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
