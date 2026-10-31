import { sortedRoster } from './roster';
import { DEFAULT_START } from './solo';
import { buildSchedule, canBuildSchedule } from './schedule';
import type { MatchId, Player, PlayerId, Score, Training } from './types';

export function newTraining(id: string, today: string, last: Training | null): Training {
  return {
    id,
    date: today,
    startTime: last?.startTime ?? DEFAULT_START,
    mode: last?.mode ?? 'team',
    tables: last?.tables ?? 4,
    attendees: [],
    scores: {},
    soloResults: {},
  };
}

/**
 * Zaškrtnutí / odškrtnutí přítomného. Nový hráč se vloží hned za posledního
 * přítomného, který je na soupisce před ním (jinak na začátek) – přítomní
 * v pořadí soupisky v něm zůstanou.
 */
export function toggleAttendee(t: Training, playerId: PlayerId, players: Player[]): Training {
  if (t.attendees.includes(playerId)) {
    return { ...t, attendees: t.attendees.filter((p) => p !== playerId) };
  }
  const order = sortedRoster(players).map((p) => p.id);
  const before = new Set(order.slice(0, Math.max(0, order.indexOf(playerId))));
  let insertAt = 0;
  t.attendees.forEach((p, i) => {
    if (before.has(p)) insertAt = i + 1;
  });
  const attendees = [...t.attendees];
  attendees.splice(insertAt, 0, playerId);
  return { ...t, attendees };
}

export function moveAttendee(t: Training, playerId: PlayerId, dir: -1 | 1): Training {
  const i = t.attendees.indexOf(playerId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= t.attendees.length) return t;
  const attendees = [...t.attendees];
  [attendees[i], attendees[j]] = [attendees[j], attendees[i]];
  return { ...t, attendees };
}

export function isEmptyScore(s: Score | undefined): boolean {
  return !s || [s.ga, s.gb, s.la, s.lb].every((v) => v === null || v === undefined);
}

function matchIds(t: Training): Set<MatchId> {
  return new Set(canBuildSchedule(t) ? buildSchedule(t).matches.map((m) => m.id) : []);
}

/** Skórované zápasy z `before`, které v rozpisu `after` nejsou. */
export function lostScores(before: Training, after: Training): MatchId[] {
  const ids = matchIds(after);
  return Object.entries(before.scores)
    .filter(([id, s]) => !isEmptyScore(s) && !ids.has(id))
    .map(([id]) => id);
}

export function pruneScores(t: Training): Training {
  const ids = matchIds(t);
  const scores = Object.fromEntries(Object.entries(t.scores).filter(([id]) => ids.has(id)));
  return Object.keys(scores).length === Object.keys(t.scores).length ? t : { ...t, scores };
}

export function setScore(t: Training, id: MatchId, field: keyof Score, value: number | null): Training {
  return { ...t, scores: { ...t.scores, [id]: { ...t.scores[id], [field]: value } } };
}

export function sortTrainings(ts: Training[]): Training[] {
  return [...ts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
