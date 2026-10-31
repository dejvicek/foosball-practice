import { currentRow, firstIncomplete, minutesSinceStart } from './now';
import { buildSchedule } from '../domain/schedule';
import { training } from '../test/fixtures';
import { H } from '../test/fixtures';

describe('now', () => {
  it('minuty od začátku jen v den tréninku', () => {
    expect(minutesSinceStart('2026-10-31', '18:00', new Date(2026, 9, 31, 19, 21))).toBe(81);
    expect(minutesSinceStart('2026-10-30', '18:00', new Date(2026, 9, 31, 19, 21))).toBeNull();
  });

  it('v 19:21 běží Kolo 3; před začátkem nic', () => {
    const s = buildSchedule({ mode: 'team', tables: 4, attendees: H(8) });
    const ref = currentRow(s, 81)!;
    expect(s.sections[ref.section].rows[ref.row].label).toBe('Kolo 3');
    expect(currentRow(s, -5)).toBeNull();
    expect(currentRow(s, null)).toBeNull();
  });

  it('první blok s chybějícím zápisem', () => {
    const t = training('t', '2026-10-31', 'team', H(8));
    const s = buildSchedule(t);
    const ref = firstIncomplete(s, t)!;
    expect(s.sections[ref.section].rows[ref.row].label).toBe('Rozehrání s počítáním');
  });
});
