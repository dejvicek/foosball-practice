/** Seznam posunutý o k pozic (k bere modulo délka). */
export function rotate<T>(arr: T[], k: number): T[] {
  if (arr.length === 0) return [];
  const s = k % arr.length;
  return arr.slice(s).concat(arr.slice(0, s));
}

/** Round-robin rozdělení: prvek s indexem i jde do skupiny i mod g. */
export function groups<T>(list: T[], g: number): T[][] {
  const res: T[][] = Array.from({ length: g }, () => []);
  list.forEach((p, i) => res[i % g].push(p));
  return res;
}
