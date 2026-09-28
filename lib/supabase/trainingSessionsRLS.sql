alter table training_sessions enable row level security;
create policy "training_sessions_authenticated_all" on training_sessions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
