import { MIN_TRAININGS, resolveRange, type LadderRange, type LadderView } from './ladder';
import { SOLO_METRICS } from './solo';
import { pruneEntries } from './training';
import type { PlayerId, SoloMetric, SoloResults, Training } from './types';

export interface SoloLadderRow {
  playerId: PlayerId;
  /** Počet tréninků se záznamem. */
  trainings: number;
  sum: number;
  sumMax: number;
  /** Průměrná hodnota na trénink. */
  avg: number;
  /** sum / sumMax */
  rate: number;
}

export interface SoloLadderTable {
  metric: SoloMetric;
  ranked: SoloLadderRow[];
  lowData: SoloLadderRow[];
}

/** Výsledky sólové části, které mají v rozpisu tréninku místo (stejně jako úklid 5.8). */
export function validSolo(t: Training): SoloResults {
  return pruneEntries(t).soloResults;
}

/** PRD 5.9: žebříček pro každou metriku sólové části. */
export function computeSoloLadder(
  trainings: Training[],
  range: LadderRange,
  view: LadderView,
  today: string,
): SoloLadderTable[] {
  const r = resolveRange(range, today);
  const acc = new Map<SoloMetric, Map<PlayerId, { trainings: number; sum: number }>>();
  for (const t of trainings) {
    if ((r.from && t.date < r.from) || (r.to && t.date > r.to)) continue;
    for (const [p, metrics] of Object.entries(validSolo(t)))
      for (const [m, v] of Object.entries(metrics)) {
        if (v === undefined || v === null) continue;
        const byPlayer = acc.get(m as SoloMetric) ?? new Map();
        const cur = byPlayer.get(p) ?? { trainings: 0, sum: 0 };
        cur.trainings++;
        cur.sum += v;
        byPlayer.set(p, cur);
        acc.set(m as SoloMetric, byPlayer);
      }
  }

  return SOLO_METRICS.filter((def) => acc.has(def.id)).map((def) => {
    const rows: SoloLadderRow[] = [...acc.get(def.id)!.entries()].map(([playerId, x]) => ({
      playerId,
      trainings: x.trainings,
      sum: x.sum,
      sumMax: x.trainings * def.max,
      avg: x.sum / x.trainings,
      rate: x.sum / (x.trainings * def.max),
    }));
    const cmp = (a: SoloLadderRow, b: SoloLadderRow) =>
      (def.lowerIsBetter ? a.rate - b.rate : b.rate - a.rate) ||
      b.trainings - a.trainings ||
      (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0);
    rows.sort(cmp);
    if (view === 'total') return { metric: def.id, ranked: rows, lowData: [] };
    return {
      metric: def.id,
      ranked: rows.filter((x) => x.trainings >= MIN_TRAININGS),
      lowData: rows.filter((x) => x.trainings < MIN_TRAININGS),
    };
  });
}
