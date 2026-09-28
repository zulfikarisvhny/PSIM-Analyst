-- Same gap as team_style_stats/team_match_stats: RLS enabled on
-- match_time_segments with no policy attached, so authenticated queries
-- silently return zero rows (confirmed: anon/authenticated select on the
-- existing table came back empty even though rows are visible in the
-- Table Editor with the service role).
alter table match_time_segments enable row level security;
drop policy if exists "match_time_segments_authenticated_all" on match_time_segments;
create policy "match_time_segments_authenticated_all" on match_time_segments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
