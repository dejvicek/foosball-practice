import { useEffect, useState } from 'react';
import { todayIso } from './dates';
import type { Schedule, Training } from '../domain/types';

/** Minuty od začátku tréninku, nebo null, když trénink není dnes. */
export function minutesSinceStart(date: string, startTime: string, now: Date): number | null {
  if (todayIso(now) !== date) return null;
  const [h, m] = startTime.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
}

export interface RowRef {
  section: number;
  row: number;
}

export const rowKey = (r: RowRef) => `${r.section}:${r.row}`;

/** Všechny řádky rozpisu v pořadí. */
export function flatRows(s: Schedule): RowRef[] {
  return s.sections.flatMap((sec, si) => sec.rows.map((_, ri) => ({ section: si, row: ri })));
}

/** Řádek, který podle hodin právě běží (poslední s časem ≤ teď). */
export function currentRow(s: Schedule, sinceStart: number | null): RowRef | null {
  if (sinceStart === null || sinceStart < 0) return null;
  let found: RowRef | null = null;
  for (const ref of flatRows(s)) if (s.sections[ref.section].rows[ref.row].time <= sinceStart) found = ref;
  return found;
}

/** První řádek, kde něco chybí zapsat (zápas bez skóre nebo hráč bez výsledku). */
export function firstIncomplete(s: Schedule, t: Training): RowRef | null {
  for (const ref of flatRows(s)) {
    const row = s.sections[ref.section].rows[ref.row];
    for (const c of row.cells) {
      if (!c) continue;
      if (c.type === 'match') {
        const sc = t.scores[c.match.id];
        if (sc?.ga === undefined || sc?.ga === null || sc?.gb === undefined || sc?.gb === null) return ref;
      } else if (c.metric && c.players.some((p) => t.soloResults[p]?.[c.metric!] === undefined)) return ref;
    }
  }
  return null;
}

/** Aktuální čas, obnovovaný každou minutu. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
