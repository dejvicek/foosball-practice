import { addPlayer } from '../../domain/roster';
import { useMemo, useState } from 'react';
import { buildSchedule, canBuildSchedule } from '../../domain/schedule';
import { lostEntries, pruneEntries, toggleAttendee, type LostEntries } from '../../domain/training';
import type { Training } from '../../domain/types';
import { Explanations } from '../components/Explanations';
import { TrainingTable } from '../components/TrainingTable';
import { currentRow, defaultOpenRow, minutesSinceStart, rowKey, useNow } from '../now';
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
  a.mode !== b.mode || a.tables !== b.tables || a.attendees.join() !== b.attendees.join() || a.simSplit !== b.simSplit;
// Pozn.: startTime ani datum rozpis nemění, ukládají se přes saveTraining.

export function TrainingPage({ store, id, navigate }: { store: AppStore; id: string; navigate: (r: Route) => void }) {
  const training = store.data.trainings.find((t) => t.id === id);
  // Rozpis závisí i na skóre: týmy simulace se dělí podle výkonu ve scénářové lize.
  const schedule = useMemo(() => (training && canBuildSchedule(training) ? buildSchedule(training) : null), [training]);
  const names = useMemo(() => Object.fromEntries(store.data.players.map((p) => [p.id, p.name])), [store.data.players]);
  const now = useNow();
  // null = výchozí (běžící / první nevyplněný blok), '' = vše sbalené, jinak klíč řádku
  const [expanded, setExpanded] = useState<string | null>(null);
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

  const since = minutesSinceStart(training.date, training.startTime, now);
  const current = schedule ? currentRow(schedule, since) : null;
  const fallback = schedule ? defaultOpenRow(schedule, training, since) : null;
  const openKey = expanded ?? (fallback ? rowKey(fallback) : null);

  const apply = (changed: Training) => {
    // Změna sestavy odemkne zamčené týmy simulace (přepočítají se).
    const next = configChanged(training, changed) ? { ...changed, simTeams: null } : changed;
    const msg = lossMessage(lostEntries(training, next));
    if (msg && !confirm(msg)) return;
    if (configChanged(training, next)) {
      store.updateTrainingConfig(pruneEntries(next));
      setExpanded(null); // klíč řádku je pozice – po změně rozpisu platí výchozí rozbalení
    }
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
      <p className="dateline">
        {MODE_LABEL[training.mode]}, {training.attendees.length} {plural(training.attendees.length, 'hráč', 'hráči', 'hráčů')}, {training.tables} stoly
      </p>

      <TrainingSetup training={training} players={store.data.players} onChange={apply} onAddPlayer={onAddPlayer} />

      {schedule && (
        <>
          <TrainingTable
            schedule={schedule}
            training={training}
            names={names}
            current={current}
            expanded={openKey}
            onToggle={(key) => setExpanded(openKey === key ? '' : key)}
            onScore={(matchId, s) => {
              const m = schedule.matches.find((x) => x.id === matchId);
              // První výsledek simulace zamkne týmy, aby je pozdější opravy ligy nepřeházely.
              if (m?.block === 'sim' && !training.simTeams && schedule.teams)
                store.saveTraining({ ...training, simTeams: schedule.teams });
              store.saveScore(training.id, matchId, s);
            }}
            onSolo={(playerId, metric, value) => store.saveSolo(training.id, playerId, metric, value)}
          />
          <div className="actions-row no-print">
            <button type="button" className="ghost" onClick={() => window.print()}>
              Vytisknout rozpis
            </button>
          </div>
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
            if (confirm('Smazat celý trénink včetně zapsaných skóre a výsledků?')) {
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
