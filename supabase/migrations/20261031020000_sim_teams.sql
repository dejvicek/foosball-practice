-- Migrace 3: rozdělení týmů pro simulaci ligového kola (PRD 5.3).
-- Dá se spustit opakovaně.
alter table public.trainings
  add column if not exists sim_split text not null default 'performance',
  add column if not exists sim_teams jsonb;

do $$ begin
  alter table public.trainings
    add constraint trainings_sim_split_check check (sim_split in ('performance', 'order'));
exception when duplicate_object then null; end $$;
