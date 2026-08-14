create table if not exists public.striker_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.striker_state enable row level security;

drop policy if exists striker_state_anon_all on public.striker_state;
create policy striker_state_anon_all
  on public.striker_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on table public.striker_state to anon, authenticated;

notify pgrst, 'reload schema';
