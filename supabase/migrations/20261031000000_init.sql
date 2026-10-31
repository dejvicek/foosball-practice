-- Foosball trénink – schéma fáze 1 (PRD kap. 6).
-- Spusť jednou v Supabase: SQL Editor → New query → vložit → Run.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  archived boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now()
);
create unique index if not exists players_name_lower on public.players (lower(name));

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  mode text not null check (mode in ('team', 'single')),
  tables smallint not null check (tables between 2 and 4),
  attendees uuid[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists trainings_date on public.trainings (date desc);

create table if not exists public.scores (
  training_id uuid not null references public.trainings (id) on delete cascade,
  match_id text not null,
  ga smallint check (ga >= 0),
  gb smallint check (gb >= 0),
  la smallint check (la >= 0),
  lb smallint check (lb >= 0),
  updated_at timestamptz not null default now(),
  primary key (training_id, match_id)
);

alter table public.players enable row level security;
alter table public.trainings enable row level security;
alter table public.scores enable row level security;

-- Fáze 1 bez přihlášení: kdokoli s anon klíčem smí číst i zapisovat.
-- Ve fázi 3 nahradit politikami podle přihlášeného uživatele.
create policy "anon all" on public.players for all to anon using (true) with check (true);
create policy "anon all" on public.trainings for all to anon using (true) with check (true);
create policy "anon all" on public.scores for all to anon using (true) with check (true);
