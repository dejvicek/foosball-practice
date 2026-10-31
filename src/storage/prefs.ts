import type { LadderRange, LadderView } from '../domain/ladder';

export interface UiPrefs {
  ladderRange: LadderRange;
  ladderView: LadderView;
}

const KEY = 'foosball-practice.prefs.v1';
export const defaultPrefs = (): UiPrefs => ({ ladderRange: { kind: 'form' }, ladderView: 'avg' });

function valid(p: unknown): p is UiPrefs {
  if (!p || typeof p !== 'object') return false;
  const { ladderRange: r, ladderView: v } = p as UiPrefs;
  if (v !== 'avg' && v !== 'total') return false;
  if (!r || typeof r !== 'object') return false;
  if (r.kind === 'form' || r.kind === 'all') return true;
  return r.kind === 'custom' && typeof r.from === 'string' && typeof r.to === 'string';
}

/** Nastavení zařízení (localStorage); nečitelné nebo chybějící → výchozí. */
export function loadPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : null;
    return valid(p) ? p : defaultPrefs();
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(p: UiPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* bez uložení to běží dál */
  }
}
