import { isEmptyScore } from '../domain/training';
import { StorageError } from './errors';
import type { AppData, Repository } from './repository';

const copy = <T>(v: T): T => structuredClone(v);

/** Repozitář v paměti – pro testy a vývoj bez sítě. */
export function memoryRepository(
  initial?: AppData,
  opts: { failLoad?: boolean; failSaves?: number; failPermanent?: number } = {},
): Repository & { snapshot(): AppData } {
  let data: AppData = copy(initial ?? { players: [], trainings: [] });
  let failSaves = opts.failSaves ?? 0;
  let failPermanent = opts.failPermanent ?? 0;

  const write = async (fn: () => void) => {
    if (failPermanent > 0) {
      failPermanent--;
      throw new StorageError('Simulovaná trvalá chyba', true, 'server změnu odmítl');
    }
    if (failSaves > 0) {
      failSaves--;
      throw new Error('Simulovaná chyba zápisu');
    }
    fn();
  };

  const training = (id: string) => data.trainings.find((t) => t.id === id);

  return {
    snapshot: () => copy(data),
    async loadAll() {
      if (opts.failLoad) throw new Error('Simulovaná chyba načtení');
      return copy(data);
    },
    savePlayer: (p) =>
      write(() => {
        const i = data.players.findIndex((x) => x.id === p.id);
        data.players = i < 0 ? [...data.players, copy(p)] : data.players.map((x) => (x.id === p.id ? copy(p) : x));
      }),
    deletePlayer: (id) =>
      write(() => {
        data.players = data.players.filter((p) => p.id !== id);
      }),
    saveTraining: (t) =>
      write(() => {
        const existing = training(t.id);
        const next = { ...copy(t), scores: existing ? existing.scores : {} };
        data.trainings = existing ? data.trainings.map((x) => (x.id === t.id ? next : x)) : [...data.trainings, next];
      }),
    deleteTraining: (id) =>
      write(() => {
        data.trainings = data.trainings.filter((t) => t.id !== id);
      }),
    saveScore: (trainingId, matchId, s) =>
      write(() => {
        const t = training(trainingId);
        if (!t) throw new Error('Trénink neexistuje');
        if (isEmptyScore(s)) delete t.scores[matchId];
        else t.scores[matchId] = copy(s);
      }),
    replaceScores: (trainingId, keep) =>
      write(() => {
        const t = training(trainingId);
        if (!t) return;
        const k = new Set(keep);
        t.scores = Object.fromEntries(Object.entries(t.scores).filter(([id]) => k.has(id)));
      }),
  };
}
