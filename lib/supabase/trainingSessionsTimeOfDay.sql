-- A day can have more than one session across different parts of the day
-- (e.g. Gym in the morning + a training session in the afternoon) — this
-- adds that slot so training_sessions can hold one row per session instead
-- of being limited to a single category per date. Also widens the
-- category check constraint to match the vocabulary actually used in the
-- club's own training schedule PDF (the existing constraint only allowed
-- a couple of unrelated values, e.g. "Gym"/"Individual", and rejected
-- "Train"/"OFF"/"Match"/etc.).
alter table training_sessions add column if not exists time_of_day text
  check (time_of_day in ('morning', 'early_afternoon', 'afternoon', 'evening'));

alter table training_sessions drop constraint if exists training_sessions_category_check;
alter table training_sessions add constraint training_sessions_category_check
  check (category in ('Train', 'OFF', 'Gym', 'Meeting', 'FM', 'Match', 'Travel', 'Individual'));
