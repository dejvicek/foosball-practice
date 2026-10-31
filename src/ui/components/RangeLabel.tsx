import { resolveRange, type LadderRange } from '../../domain/ladder';
import { formatDate } from '../dates';

export function rangeText(range: LadderRange, today: string): string {
  const r = resolveRange(range, today);
  if (!r.from || !r.to) return 'Všechny uložené tréninky';
  const [fy, fm, fd] = r.from.split('-').map(Number);
  const [ty] = r.to.split('-').map(Number);
  return fy === ty ? `${fd}. ${fm}. – ${formatDate(r.to)}` : `${formatDate(r.from)} – ${formatDate(r.to)}`;
}
