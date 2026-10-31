import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEmptyScore } from '../domain/training';
import type { MatchId, Player, PlayerId, Score, Training } from '../domain/types';
import { isPermanent, userMessageOf } from '../storage/errors';
import type { AppData, Repository } from '../storage/repository';
import { newUuid } from './ids';

export type Status = 'loading' | 'error' | 'ready';
export type SaveState = 'idle' | 'saving' | 'retrying';

export interface AppStore {
  status: Status;
  data: AppData;
  saveState: SaveState;
  /** Zpráva o zápisu, který server trvale odmítl (zahozen, data znovu načtena). */
  saveError: string | null;
  dismissSaveError(): void;
  reload(): void;
  savePlayer(p: Player): void;
  deletePlayer(id: PlayerId): void;
  /** Jen konfigurace tréninku; skóre nemění. */
  saveTraining(t: Training): void;
  /** Konfigurace + smazání skóre zápasů, které v `t.scores` nejsou (po pruneEntries). */
  updateTrainingConfig(t: Training): void;
  deleteTraining(id: string): void;
  /** Lokálně hned, do úložiště s odstupem SCORE_DEBOUNCE_MS za zápas. */
  saveScore(trainingId: string, matchId: MatchId, s: Score): void;
  newId(): string;
}

export const RETRY_DELAYS_MS = [2000, 5000, 10000];
export const SCORE_DEBOUNCE_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export function useAppState(repo: Repository): AppStore {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppData>({ players: [], trainings: [] });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loadNonce, setLoadNonce] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const queue = useRef<(() => Promise<void>)[]>([]);
  const running = useRef(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    repo.loadAll().then(
      (d) => {
        if (!alive) return;
        setData(d);
        setStatus('ready');
      },
      () => alive && setStatus('error'),
    );
    return () => {
      alive = false;
    };
  }, [repo, loadNonce]);

  // Sériová fronta: zápisy v pořadí, chyba → opakování se stejným zápisem.
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setSaveState('saving');
    let attempt = 0;
    let rejected = false;
    while (queue.current.length) {
      try {
        await queue.current[0]();
        queue.current.shift();
        attempt = 0;
        setSaveState('saving');
      } catch (e) {
        if (isPermanent(e)) {
          // Opakování nepomůže: zápis zahodit, pokračovat a nakonec srovnat stav se serverem.
          queue.current.shift();
          attempt = 0;
          rejected = true;
          setSaveError(`Změnu se nepodařilo uložit (${userMessageOf(e)}). Zobrazuji data ze serveru.`);
          setSaveState('saving');
          continue;
        }
        setSaveState('retrying');
        await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
        attempt++;
      }
    }
    if (rejected) {
      try {
        setData(await repo.loadAll());
      } catch {
        /* necháme lokální stav; další načtení to srovná */
      }
    }
    running.current = false;
    setSaveState('idle');
  }, [repo]);

  const enqueue = useCallback(
    (op: () => Promise<void>) => {
      queue.current.push(op);
      void pump();
    },
    [pump],
  );

  // Varování při zavření stránky s neuloženými změnami.
  useEffect(() => {
    const on = (e: BeforeUnloadEvent) => {
      if (queue.current.length || timers.current.size) e.preventDefault();
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, []);

  /** Zruší čekající (debounce) zápisy skóre tréninku, které nemají přežít. */
  const cancelPendingScores = useCallback((trainingId: string, keep: (matchId: MatchId) => boolean) => {
    for (const [key, timer] of timers.current) {
      const [tid, mid] = key.split('::');
      if (tid === trainingId && !keep(mid)) {
        clearTimeout(timer);
        timers.current.delete(key);
      }
    }
  }, []);

  const actions = useMemo(
    () => ({
      reload: () => setLoadNonce((n) => n + 1),
      dismissSaveError: () => setSaveError(null),
      savePlayer: (p: Player) => {
        setData((d) => ({ ...d, players: upsert(d.players, p) }));
        enqueue(() => repo.savePlayer(p));
      },
      deletePlayer: (id: PlayerId) => {
        setData((d) => ({ ...d, players: d.players.filter((p) => p.id !== id) }));
        enqueue(() => repo.deletePlayer(id));
      },
      saveTraining: (t: Training) => {
        setData((d) => ({
          ...d,
          trainings: upsert(d.trainings, { ...t, scores: d.trainings.find((x) => x.id === t.id)?.scores ?? {} }),
        }));
        enqueue(() => repo.saveTraining(t));
      },
      updateTrainingConfig: (t: Training) => {
        cancelPendingScores(t.id, (mid) => mid in t.scores);
        setData((d) => ({ ...d, trainings: upsert(d.trainings, t) }));
        enqueue(() => repo.saveTraining(t));
        enqueue(() => repo.replaceScores(t.id, Object.keys(t.scores)));
      },
      deleteTraining: (id: string) => {
        cancelPendingScores(id, () => false);
        setData((d) => ({ ...d, trainings: d.trainings.filter((t) => t.id !== id) }));
        enqueue(() => repo.deleteTraining(id));
      },
      saveScore: (trainingId: string, matchId: MatchId, s: Score) => {
        setData((d) => ({
          ...d,
          trainings: d.trainings.map((t) => {
            if (t.id !== trainingId) return t;
            const scores = { ...t.scores };
            if (isEmptyScore(s)) delete scores[matchId];
            else scores[matchId] = s;
            return { ...t, scores };
          }),
        }));
        const key = `${trainingId}::${matchId}`;
        const prev = timers.current.get(key);
        if (prev) clearTimeout(prev);
        timers.current.set(
          key,
          setTimeout(() => {
            timers.current.delete(key);
            enqueue(() => repo.saveScore(trainingId, matchId, s));
          }, SCORE_DEBOUNCE_MS),
        );
      },
      newId: newUuid,
    }),
    [repo, enqueue, cancelPendingScores],
  );

  return { status, data, saveState, saveError, ...actions };
}
