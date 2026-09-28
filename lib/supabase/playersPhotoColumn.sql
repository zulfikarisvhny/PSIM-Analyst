-- Adds a photo_url column to players, for headshots uploaded to the
-- "Players Image" storage bucket (public). Nullable — most non-PSIM clubs'
-- players won't have one.
alter table players add column if not exists photo_url text;
