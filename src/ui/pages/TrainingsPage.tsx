import { newTraining, sortTrainings } from '../../domain/training';
import { formatDateLong, todayIso } from '../dates';
import { MODE_LABEL, plural } from '../format';
import type { AppStore } from '../useAppState';
import type { Route } from '../useHashRoute';

export function TrainingsPage({ store, navigate }: { store: AppStore; navigate: (r: Route) => void }) {
  const trainings = sortTrainings(store.data.trainings);

  const create = () => {
    const t = newTraining(store.newId(), todayIso(), trainings[0] ?? null);
    store.saveTraining(t);
    navigate({ page: 'training', id: t.id });
  };

  return (
    <section>
      <h1>Trénink</h1>
      <div className="actions-row">
        <button type="button" onClick={create}>
          Nový trénink
        </button>
      </div>
      {trainings.length === 0 ? (
        <p className="note">Zatím žádný trénink. Začni tlačítkem Nový trénink.</p>
      ) : (
        <ul className="training-list" aria-label="Uložené tréninky">
          {trainings.map((t) => {
            const n = t.attendees.length;
            return (
              <li key={t.id}>
                <button type="button" onClick={() => navigate({ page: 'training', id: t.id })}>
                  <span>{formatDateLong(t.date)}</span>
                  <span className="sub">
                    {MODE_LABEL[t.mode]}, {n} {plural(n, 'hráč', 'hráči', 'hráčů')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
