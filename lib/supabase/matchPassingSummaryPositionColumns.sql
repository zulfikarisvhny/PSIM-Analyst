-- Adds each player's average on-pitch position (from the POSITIONS page's
-- own diagram — jersey positioned at the average point of every ball touch)
-- to match_passing_summary, so the pass network can be drawn on a real pitch
-- instead of a synthetic formation-slot layout.
alter table match_passing_summary add column if not exists x_pct numeric;
alter table match_passing_summary add column if not exists y_pct numeric;
alter table match_passing_summary add column if not exists jersey_number int;
