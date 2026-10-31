import { isEmptyScore, playerFromRow, playerToRow, scoreToRow, soloToRows, trainingFromRow, trainingToRow } from './mapping';
import type { Player, Training } from '../domain/types';

const player: Player = { id: 'p1', name: 'Honza', archived: false, order: 3 };
const training: Training = {
  id: 't1',
  date: '2026-10-31', startTime: '18:00', soloResults: {},
  mode: 'team',
  tables: 4,
  attendees: ['p1', 'p2', 'p3', 'p4'],
  scores: { 'league|1|1|p1+p2vp3+p4': { ga: 6, gb: 2, la: 1, lb: 0 } },
  notes: 'pozn',
};

describe('mapping', () => {
  it('hráč tam a zpět', () => {
    expect(playerToRow(player)).toEqual({ id: 'p1', name: 'Honza', archived: false, sort_order: 3 });
    expect(playerFromRow(playerToRow(player))).toEqual(player);
  });

  it('trénink tam a zpět včetně skóre jen svého tréninku', () => {
    const rows = [
      scoreToRow('t1', 'league|1|1|p1+p2vp3+p4', { ga: 6, gb: 2, la: 1, lb: 0 }),
      scoreToRow('jiny', 'x', { ga: 1, gb: 1 }),
    ];
    expect(trainingFromRow(trainingToRow(training), rows, [])).toEqual(training);
  });

  it('trénink bez poznámky nemá klíč notes', () => {
    const { notes: _n, ...noNotes } = training;
    const back = trainingFromRow(trainingToRow({ ...noNotes, scores: {} }), [], []);
    expect(back).toEqual({ ...noNotes, scores: {} });
  });

  it('čas začátku a výsledky sólové části tam a zpět', () => {
    const t: Training = { ...training, startTime: '17:30', soloResults: { p1: { fiveBarControl: 2, setShooting: 0 }, p2: { warmupPasses: 18 } } };
    const solo = [...soloToRows(t), { training_id: 'jiny', player_id: 'p1', metric: 'chain' as const, value: 3 }];
    expect(trainingToRow(t).start_time).toBe('17:30');
    expect(trainingFromRow(trainingToRow(t), [], solo)).toEqual({ ...t, scores: {} });
  });

  it('starý řádek bez start_time dostane 18:00', () => {
    const row = { ...trainingToRow(training), start_time: null };
    expect(trainingFromRow(row, [], []).startTime).toBe('18:00');
  });

  it('isEmptyScore: nula je platné skóre', () => {
    expect(isEmptyScore({ ga: null, gb: undefined })).toBe(true);
    expect(isEmptyScore({ ga: 0 })).toBe(false);
  });
});
