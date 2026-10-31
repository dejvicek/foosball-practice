-- Migrace 4: ruční sestavení týmů simulace.
alter table public.trainings drop constraint if exists trainings_sim_split_check;
alter table public.trainings
  add constraint trainings_sim_split_check check (sim_split in ('performance', 'order', 'manual'));
