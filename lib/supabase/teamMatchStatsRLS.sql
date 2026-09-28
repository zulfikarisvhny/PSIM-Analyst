-- Same gap as team_style_stats: RLS enabled on team_match_stats with no
-- policy attached, so authenticated queries silently return zero rows.
alter table team_match_stats enable row level security;
create policy "team_match_stats_authenticated_all" on team_match_stats for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
