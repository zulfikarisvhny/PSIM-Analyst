-- Grants full read/write to any logged-in staff member ("authenticated"
-- role) on team_style_stats, same pattern as psimTablesRLS.sql. RLS was
-- enabled on this table with no policy attached, so authenticated queries
-- were silently returning zero rows (no error) instead of the real 18.
alter table team_style_stats enable row level security;
create policy "team_style_stats_authenticated_all" on team_style_stats for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
