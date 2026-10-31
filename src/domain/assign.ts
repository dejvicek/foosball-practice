import type { MatchKind, PlayerId } from './types';

export interface Pairing {
  kind: MatchKind;
  a: PlayerId[];
  b: PlayerId[];
}

/** PRD 5.2: nejdřív dvojice, pak singly, zbytek čeká (rozhodčí / počítá). */
export function assign(
  list: PlayerId[],
  tables: number,
  singlesOnly: boolean,
): { tables: Pairing[]; waiting: PlayerId[] } {
  const used: Pairing[] = [];
  let i = 0;
  if (!singlesOnly) {
    while (list.length - i >= 4 && used.length < tables) {
      used.push({ kind: 'doubles', a: [list[i], list[i + 1]], b: [list[i + 2], list[i + 3]] });
      i += 4;
    }
  }
  while (list.length - i >= 2 && used.length < tables) {
    used.push({ kind: 'singles', a: [list[i]], b: [list[i + 1]] });
    i += 2;
  }
  return { tables: used, waiting: list.slice(i) };
}
