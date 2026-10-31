/** Hráči H1..Hn v nominačním pořadí. */
export const H = (n: number): string[] => Array.from({ length: n }, (_, i) => 'H' + (i + 1));

export const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
