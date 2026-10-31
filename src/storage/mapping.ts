import { DEFAULT_START } from '../domain/solo';
import { isEmptyScore } from '../domain/training';
import type { MatchId, Mode, Player, Score, TableCount, Training } from '../domain/types';

export { isEmptyScore };

export interface PlayerRow {
  id: string;
  name: string;
  archived: boolean;
  sort_order: number;
}

export interface TrainingRow {
  id: string;
  date: string;
  mode: Mode;
  tables: number;
  attendees: string[];
  notes: string | null;
}

export interface ScoreRow {
  training_id: string;
  match_id: string;
  ga: number | null;
  gb: number | null;
  la: number | null;
  lb: number | null;
}

export const playerToRow = (p: Player): PlayerRow => ({
  id: p.id,
  name: p.name,
  archived: p.archived,
  sort_order: p.order,
});

export const playerFromRow = (r: PlayerRow): Player => ({
  id: r.id,
  name: r.name,
  archived: r.archived,
  order: r.sort_order,
});

export const trainingToRow = (t: Training): TrainingRow => ({
  id: t.id,
  date: t.date,
  mode: t.mode,
  tables: t.tables,
  attendees: t.attendees,
  notes: t.notes ?? null,
});

const SCORE_FIELDS = ['ga', 'gb', 'la', 'lb'] as const;

function scoreFromRow(r: ScoreRow): Score {
  const s: Score = {};
  for (const f of SCORE_FIELDS) if (r[f] !== null && r[f] !== undefined) s[f] = r[f];
  return s;
}

export function trainingFromRow(r: TrainingRow, scores: ScoreRow[]): Training {
  const t: Training = {
    id: r.id,
    date: r.date,
    startTime: DEFAULT_START,
    mode: r.mode,
    tables: r.tables as TableCount,
    attendees: r.attendees ?? [],
    scores: Object.fromEntries(scores.filter((s) => s.training_id === r.id).map((s) => [s.match_id, scoreFromRow(s)])),
    soloResults: {},
  };
  if (r.notes !== null && r.notes !== undefined) t.notes = r.notes;
  return t;
}

export const scoreToRow = (trainingId: string, matchId: MatchId, s: Score): ScoreRow => ({
  training_id: trainingId,
  match_id: matchId,
  ga: s.ga ?? null,
  gb: s.gb ?? null,
  la: s.la ?? null,
  lb: s.lb ?? null,
});
