import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isEmptyScore } from '../domain/training';
import {
  playerFromRow,
  playerToRow,
  scoreToRow,
  trainingFromRow,
  trainingToRow,
  type PlayerRow,
  type ScoreRow,
  type TrainingRow,
} from './mapping';
import { fromPostgrest } from './errors';
import type { Repository } from './repository';

const PAGE = 1000; // PostgREST vrací nejvýš 1000 řádků na dotaz

function check<T>(res: { data: T | null; error: { message: string; code?: string } | null; status: number }): T {
  if (res.error) throw fromPostgrest(res.error, res.status);
  return res.data as T;
}

async function selectAll<T>(client: SupabaseClient, table: string, orderBy: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select('*');
    for (const col of orderBy) q = q.order(col);
    const rows = check<T[]>(await q.range(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export function supabaseRepository(url: string, anonKey: string): Repository {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });

  return {
    async loadAll() {
      const [players, trainings, scores] = await Promise.all([
        selectAll<PlayerRow>(client, 'players', ['id']),
        selectAll<TrainingRow>(client, 'trainings', ['id']),
        selectAll<ScoreRow>(client, 'scores', ['training_id', 'match_id']),
      ]);
      return {
        players: players.map(playerFromRow),
        trainings: trainings.map((t) => trainingFromRow(t, scores)),
      };
    },
    async savePlayer(p) {
      check(await client.from('players').upsert(playerToRow(p)));
    },
    async deletePlayer(id) {
      check(await client.from('players').delete().eq('id', id));
    },
    async saveTraining(t) {
      check(await client.from('trainings').upsert(trainingToRow(t)));
    },
    async deleteTraining(id) {
      check(await client.from('trainings').delete().eq('id', id));
    },
    async saveScore(trainingId, matchId, s) {
      if (isEmptyScore(s)) {
        check(await client.from('scores').delete().eq('training_id', trainingId).eq('match_id', matchId));
      } else {
        const row = { ...scoreToRow(trainingId, matchId, s), updated_at: new Date().toISOString() };
        check(await client.from('scores').upsert(row, { onConflict: 'training_id,match_id' }));
      }
    },
    async replaceScores(trainingId, keep) {
      const rows = check<{ match_id: string }[]>(
        await client.from('scores').select('match_id').eq('training_id', trainingId),
      );
      const k = new Set(keep);
      const drop = rows.map((r) => r.match_id).filter((id) => !k.has(id));
      if (drop.length) check(await client.from('scores').delete().eq('training_id', trainingId).in('match_id', drop));
    },
  };
}
