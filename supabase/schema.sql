-- Run once in your own Supabase project's SQL editor; safe to run again.
-- Email/password authentication is provided by Supabase Auth, never this table.
create table if not exists public.qrandurid_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null check (jsonb_typeof(progress) = 'object' and octet_length(progress::text) <= 65536),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

alter table public.qrandurid_progress enable row level security;
revoke all on public.qrandurid_progress from anon;
revoke all on public.qrandurid_progress from authenticated;
grant select, insert, update on public.qrandurid_progress to authenticated;

drop policy if exists "Read own progress" on public.qrandurid_progress;
create policy "Read own progress" on public.qrandurid_progress
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own progress" on public.qrandurid_progress;
create policy "Insert own progress" on public.qrandurid_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own progress" on public.qrandurid_progress;
create policy "Update own progress" on public.qrandurid_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.qrandurid_progress_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists qrandurid_progress_updated_at on public.qrandurid_progress;
create trigger qrandurid_progress_updated_at before update on public.qrandurid_progress
  for each row execute function public.qrandurid_progress_updated_at();
