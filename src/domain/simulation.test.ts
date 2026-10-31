import { buildSimulation } from './simulation';
import { H, range } from '../test/fixtures';

describe('buildSimulation', () => {
  it('n=12, t=4: 1. vlna 3 dvojice, 2. vlna 2 singly + 2 dvojice', () => {
    const s = buildSimulation(H(12), 4);
    expect(s.wave1.doubles).toBe(3);
    expect(s.wave1.singles).toBe(0);
    expect(s.wave2.singles).toBe(2);
    expect(s.wave2.doubles).toBe(2);
    expect(s.wave2.matches.map((m) => m.kind)).toEqual(['singles', 'singles', 'doubles', 'doubles']);
  });

  it('tým A = prvních ceil(n/2)', () => {
    expect(buildSimulation(H(13), 4).A).toEqual(H(7));
    expect(buildSimulation(H(13), 4).B).toEqual(H(13).slice(7));
  });

  it('ve 2. vlně jdou první ti, kdo v 1. vlně čekali (n=7, t=2)', () => {
    const s = buildSimulation(H(7), 2);
    expect(s.wave1.matches.map((m) => [m.kind, m.a, m.b])).toEqual([
      ['doubles', ['H1', 'H2'], ['H5', 'H6']],
      ['singles', ['H3'], ['H7']],
    ]);
    expect(s.wave1.restA).toEqual(['H4']);
    expect(s.wave2.matches.map((m) => [m.kind, m.a, m.b])).toEqual([
      ['singles', ['H4'], ['H5']],
      ['doubles', ['H1', 'H2'], ['H6', 'H7']],
    ]);
  });

  it('invariant: n=4..13, t=2..4 – nejvýš t zápasů, hráč nejvýš jednou, levá strana z A', () => {
    for (const n of range(4, 13))
      for (const t of range(2, 4)) {
        const s = buildSimulation(H(n), t);
        for (const w of [s.wave1, s.wave2]) {
          expect(w.matches.length).toBeLessThanOrEqual(t);
          const ps = w.matches.flatMap((m) => [...m.a, ...m.b]);
          expect(new Set(ps).size).toBe(ps.length);
          for (const m of w.matches) {
            expect(m.a.every((p) => s.A.includes(p))).toBe(true);
            expect(m.b.every((p) => s.B.includes(p))).toBe(true);
          }
        }
      }
  });
});
