import { DEFAULT_START } from '../domain/solo';
import { isEmptyScore } from '../domain/training';
import type { MatchId, Mode, Player, PlayerId, Score, SoloMetric, SoloResults, TableCount, Training } from '../domain/types';

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
  start_time: string | null;
  mode: Mode;
  tables: number;
  attendees: string[];
  notes: string | null;
}

export interface SoloRow {
  training_id: string;
  player_id: string;
  metric: SoloMetric;
  value: number;
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
  start_time: t.startTime,
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

export function trainingFromRow(r: TrainingRow, scores: ScoreRow[], solo: SoloRow[]): Training {
  const soloResults: SoloResults = {};
  for (const x of solo) {
    if (x.training_id !== r.id) continue;
    (soloResults[x.player_id] ??= {})[x.metric] = x.value;
  }
  const t: Training = {
    id: r.id,
    date: r.date,
    startTime: r.start_time || DEFAULT_START,
    mode: r.mode,
    tables: r.tables as TableCount,
    attendees: r.attendees ?? [],
    scores: Object.fromEntries(scores.filter((s) => s.training_id === r.id).map((s) => [s.match_id, scoreFromRow(s)])),
    soloResults,
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

export function soloToRows(t: Training): SoloRow[] {
  const out: SoloRow[] = [];
  for (const [player_id, metrics] of Object.entries(t.soloResults))
    for (const [metric, value] of Object.entries(metrics))
      if (value !== undefined && value !== null) out.push({ training_id: t.id, player_id, metric: metric as SoloMetric, value });
  return out;
}

export const soloRow = (trainingId: string, playerId: PlayerId, metric: SoloMetric, value: number): SoloRow => ({
  training_id: trainingId,
  player_id: playerId,
  metric,
  value,
});
