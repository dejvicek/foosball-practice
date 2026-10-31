/** Posun ISO data (YYYY-MM-DD) o `days` dní, počítáno v UTC (bez vlivu časové zóny). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
