/** České tvary: 1 hráč, 2–4 hráči, 5+ hráčů. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export const MODE_LABEL = { team: 'Týmový trénink', single: 'Trénink jedniček' } as const;
export const MODE_OPTION = { team: 'Týmový trénink (3 h)', single: 'Trénink jedniček (80 min)' } as const;

const one = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0.4166 → „0,4“; se znaménkem → „+0,4“ */
export function dec1(v: number, signed = false): string {
  const s = one.format(Math.abs(v));
  if (v < 0 && s !== '0,0') return `\u2212${s}`;
  return signed && v > 0 ? `+${s}` : s;
}

export const pct = (v: number): string => `${Math.round(v * 100)} %`;
export const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `\u2212${-v}` : '0');
