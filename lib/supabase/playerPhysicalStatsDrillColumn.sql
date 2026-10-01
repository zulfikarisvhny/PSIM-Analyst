-- Training session GPS reports break totals down per drill/period (e.g.
-- "1st GAME", "Period 6", "WARM UP", "HSR") in addition to the whole-session
-- Team Summary row. `drill` tags which one a row is (null = Team Summary,
-- the whole-session total) so re-importing a session can delete+replace its
-- full set of rows — summary and every drill — without losing the breakdown.
alter table player_physical_stats add column if not exists drill text;
