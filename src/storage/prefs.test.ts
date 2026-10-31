import { defaultPrefs, loadPrefs, savePrefs } from './prefs';

describe('prefs', () => {
  beforeEach(() => localStorage.clear());
  it('výchozí: forma + průměr', () => {
    expect(loadPrefs()).toEqual({ ladderRange: { kind: 'form' }, ladderView: 'avg' });
  });
  it('uloží a načte', () => {
    savePrefs({ ladderRange: { kind: 'custom', from: '2026-10-01', to: '2026-10-31' }, ladderView: 'total' });
    expect(loadPrefs()).toEqual({ ladderRange: { kind: 'custom', from: '2026-10-01', to: '2026-10-31' }, ladderView: 'total' });
  });
  it('nečitelná data → výchozí', () => {
    localStorage.setItem('foosball-practice.prefs.v1', '{rozbité');
    expect(loadPrefs()).toEqual(defaultPrefs());
  });
});
