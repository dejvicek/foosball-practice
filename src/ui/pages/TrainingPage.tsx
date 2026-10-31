import { addPlayer } from '../../domain/roster';
import { useMemo } from 'react';
import { buildSchedule, canBuildSchedule } from '../../domain/schedule';
import { lostEntries, pruneEntries, toggleAttendee, type LostEntries } from '../../domain/training';
import type { Training } from '../../domain/types';
import { Explanations } from '../components/Explanations';
import { ScheduleView } from '../components/ScheduleView';
import { StandingsView } from '../components/StandingsView';
import { TrainingSetup } from '../components/TrainingSetup';
import { formatDateLong } from '../dates';
import { MODE_LABEL, plural } from '../format';
import type { AppStore } from '../useAppState';
import type { Route } from '../useHashRoute';
import { persistPlayers } from './PlayersPage';

/** „Změna smaže skóre u N zápasů a M výsledků sólové části. Pokračovat?“ – null, když se nic nesmaže. */
export function lossMessage(lost: LostEntries): string | null {
  const n = lost.scores.length;
  const m = lost.solo.length;
  if (!n && !m) return null;
  const parts: string[] = [];
  if (n) parts.push(`skóre u ${n} ${plural(n, 'zápasu', 'zápasů', 'zápasů')}`);
  if (m) parts.push(`${m} ${plural(m, 'výsledek', 'výsledky', 'výsledků')} sólové části`);
  return `Změna smaže ${parts.join(' a ')}. Pokračovat?`;
}

const configChanged = (a: Training, b: Training) =>
  a.mode !== b.mode || a.tables !== b.tables || a.attendees.join() !== b.attendees.join();

export function TrainingPage({ store, id, navigate }: { store: AppStore; id: string; navigate: (r: Route) => void }) {
  const training = store.data.trainings.find((t) => t.id === id);
  const mode = training?.mode;
  const tables = training?.tables;
  const attendeesKey = training?.attendees.join(',');
  const schedule = useMemo(
    () => (training && canBuildSchedule(training) ? buildSchedule(training) : null),
    // rozpis závisí jen na typu, stolech a přítomných
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, tables, attendeesKey],
  );
  const names = useMemo(() => Object.fromEntries(store.data.players.map((p) => [p.id, p.name])), [store.data.players]);
  if (!training) {
    return (
      <section>
        <p>Trénink nenalezen.</p>
        <button type="button" className="ghost" onClick={() => navigate({ page: 'trainings' })}>
          Zpět na tréninky
        </button>
      </section>
    );
  }

  const apply = (next: Training) => {
    const msg = lossMessage(lostEntries(training, next));
    if (msg && !confirm(msg)) return;
    if (configChanged(training, next)) store.updateTrainingConfig(pruneEntries(next));
    else store.saveTraining(next);
  };

  const onAddPlayer = (name: string) => {
    const newId = store.newId();
    const r = addPlayer(store.data.players, newId, name);
    if ('error' in r) return r;
    persistPlayers(store, r.players);
    apply(toggleAttendee(training, newId, r.players));
    return { id: newId };
  };

  return (
    <section>
      <button type="button" className="back no-print" onClick={() => navigate({ page: 'trainings' })}>
        Zpět na tréninky
      </button>
      <h1>{formatDateLong(training.date)}</h1>
      <p className="dateline">{MODE_LABEL[training.mode]}</p>

      <TrainingSetup training={training} players={store.data.players} onChange={apply} onAddPlayer={onAddPlayer} />

      {schedule && (
        <>
          <div className="actions-row no-print">
            <button type="button" className="ghost" onClick={() => window.print()}>
              Vytisknout rozpis
            </button>
          </div>
          <ScheduleView
            schedule={schedule}
            names={names}
            scores={training.scores}
            playerCount={training.attendees.length}
            onScore={(matchId, s) => store.saveScore(training.id, matchId, s)}
          />
          <Explanations />
          <StandingsView
            schedule={schedule}
            scores={training.scores}
            attendees={training.attendees}
            names={names}
            onClear={() => store.updateTrainingConfig({ ...training, scores: {} })}
          />
        </>
      )}

      <div className="actions-row no-print">
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (confirm('Smazat celý trénink včetně zapsaných skóre?')) {
              store.deleteTraining(training.id);
              navigate({ page: 'trainings' });
            }
          }}
        >
          Smazat trénink
        </button>
      </div>
    </section>
  );
}
