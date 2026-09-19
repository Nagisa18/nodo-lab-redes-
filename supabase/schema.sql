create table if not exists public.results (
  id text primary key,
  "userName" text not null,
  theme text not null,
  "themeLabel" text not null,
  correct integer not null default 0,
  wrong integer not null default 0,
  score integer not null default 0,
  "createdAt" timestamptz default now()
);

alter table public.results enable row level security;

drop policy if exists "Permitir lectura publica" on public.results;
create policy "Permitir lectura publica"
on public.results for select
using (true);

drop policy if exists "Permitir insercion publica" on public.results;
create policy "Permitir insercion publica"
on public.results for insert
with check (true);