-- Migrace 2: čas začátku tréninku a výsledky sólové části (PRD 5.8, kap. 6).
-- Dá se spustit opakovaně.

alter table public.trainings
  add column if not exists start_time text not null default '18:00';

do $$ begin
  alter table public.trainings
    add constraint trainings_start_time_format check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
exception when duplicate_object then null; end $$;

create table if not exists public.solo_results (
  training_id uuid not null references public.trainings (id) on delete cascade,
  player_id uuid not null,
  metric text not null check (metric in ('warmupPasses', 'fiveBarControl', 'setShooting', 'blockToControl', 'backRodsBuildUp', 'chain')),
  value smallint not null check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (training_id, player_id, metric)
);

alter table public.solo_results enable row level security;

-- Fáze 1 bez přihlášení (stejně jako ostatní tabulky); ve fázi 3 nahradit.
drop policy if exists "anon all" on public.solo_results;
create policy "anon all" on public.solo_results for all to anon using (true) with check (true);
