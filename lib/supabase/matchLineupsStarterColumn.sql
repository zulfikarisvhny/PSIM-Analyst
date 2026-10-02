-- match_lineups previously only ever held the starting XI (see
-- insertStartingLineups's old name). Adds is_starter so the same table can
-- also hold the full bench roster (every "Substitutes" row from the PDF,
-- whether or not that player came on) — existing rows default to true since
-- they were all starters.
alter table match_lineups add column if not exists is_starter boolean not null default true;
