import { lostScores, moveAttendee, newTraining, pruneScores, setScore, sortTrainings, toggleAttendee } from './training';
import type { Player, Training } from './types';
import { H, training } from '../test/fixtures';

const roster = (ids: string[]): Player[] => ids.map((id, order) => ({ id, name: id, order, archived: false }));

describe('newTraining', () => {
  it('bez předchozího: týmový, 4 stoly, nikdo nepřítomen', () => {
    expect(newTraining('x', '2026-10-31', null)).toEqual({
      id: 'x', date: '2026-10-31', startTime: '18:00', mode: 'team', tables: 4, attendees: [], scores: {}, soloResults: {},
    });
  });
  it('typ a stoly převezme z posledního tréninku', () => {
    const last = training('l', '2026-10-01', 'single', H(5), 2);
    expect(newTraining('x', '2026-10-31', { ...last, startTime: '17:30' })).toMatchObject({ mode: 'single', tables: 2, attendees: [], startTime: '17:30' });
  });
});

describe('toggleAttendee', () => {
  const r = roster(['A', 'B', 'C', 'D']);
  const t = (attendees: string[]): Training => ({ ...training('t', '2026-10-31', 'team', attendees) });
  it('přidá hráče na místo podle soupisky', () => {
    expect(toggleAttendee(t(['A', 'C']), 'B', r).attendees).toEqual(['A', 'B', 'C']);
    expect(toggleAttendee(t([]), 'C', r).attendees).toEqual(['C']);
    expect(toggleAttendee(t(['C']), 'A', r).attendees).toEqual(['A', 'C']);
  });
  it('při upraveném pořadí vloží za posledního, kdo je na soupisce před ním', () => {
    expect(toggleAttendee(t(['C', 'A']), 'B', r).attendees).toEqual(['C', 'A', 'B']);
  });
  it('odebere přítomného', () => {
    expect(toggleAttendee(t(['A', 'B', 'C']), 'C', r).attendees).toEqual(['A', 'B']);
  });
});

describe('moveAttendee', () => {
  it('posune nahoru/dolů, na okraji nic', () => {
    const t = training('t', '2026-10-31', 'team', ['A', 'B', 'C']);
    expect(moveAttendee(t, 'B', -1).attendees).toEqual(['B', 'A', 'C']);
    expect(moveAttendee(t, 'C', 1).attendees).toEqual(['A', 'B', 'C']);
  });
});

describe('skóre při změně konfigurace', () => {
  const base = setScore(training('t', '2026-10-31', 'team', H(8)), 'league|1|1|H1+H2vH3+H4', 'ga', 6);
  it('setScore nastaví pole, null hodnoty ponechá', () => {
    expect(base.scores['league|1|1|H1+H2vH3+H4']).toEqual({ ga: 6 });
  });
  it('lostScores vrátí skórované zápasy, které v novém rozpisu nejsou', () => {
    const after = { ...base, attendees: H(8).slice(1) }; // bez H1
    expect(lostScores(base, after)).toEqual(['league|1|1|H1+H2vH3+H4']);
    expect(lostScores(base, { ...base, notes: 'x' })).toEqual([]);
  });
  it('prázdné skóre se nepočítá jako ztracené', () => {
    const t = { ...base, scores: { 'league|1|1|H1+H2vH3+H4': { ga: null, gb: null } } };
    expect(lostScores(t, { ...t, attendees: H(8).slice(1) })).toEqual([]);
  });
  it('pruneScores nechá jen skóre existujících zápasů', () => {
    expect(pruneScores({ ...base, attendees: H(8).slice(1) }).scores).toEqual({});
    expect(pruneScores(base).scores).toEqual(base.scores);
  });
  it('nepostavitelný trénink = žádné zápasy', () => {
    expect(pruneScores({ ...base, attendees: H(3) }).scores).toEqual({});
  });
  it('archivovaný hráč v přítomných nic nemaže (skóre je vázané na ID)', () => {
    expect(pruneScores(base)).toEqual(base);
  });
});

describe('sortTrainings', () => {
  it('nejnovější první, stabilně', () => {
    const ts = [training('a', '2026-10-01', 'team', []), training('b', '2026-10-05', 'team', []), training('c', '2026-10-05', 'team', [])];
    expect(sortTrainings(ts).map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });
});
