import { explanationsFor } from './explain';
import { EXPLANATIONS } from './content';
import { buildSchedule } from './schedule';
import { H } from '../test/fixtures';

const team = buildSchedule({ mode: 'team', tables: 4, attendees: H(13) });
const single = buildSchedule({ mode: 'single', tables: 2, attendees: H(5) });
const rowByLabel = (s: typeof team, label: string) => s.sections.flatMap((x) => x.rows).find((r) => r.label === label)!;
const names = (items: { name: string }[]) => items.map((i) => i.name);

describe('vysvětlivky u bloků', () => {
  it('kolo 3: Zeď; obecně Každý gól se počítá a Role rozhodčího', () => {
    const e = explanationsFor(rowByLabel(team, 'Kolo 3'));
    expect(names(e.main)).toEqual(['Zeď']);
    expect(names(e.general)).toEqual(['Každý gól se počítá', 'Role rozhodčího']);
  });
  it('kolo 5: Start 0:3 a Daň za ztrátu', () => {
    expect(names(explanationsFor(rowByLabel(team, 'Kolo 5')).main)).toEqual(['Start 0:3', 'Daň za ztrátu']);
  });
  it('stanoviště: u každého stolu jeho stanoviště', () => {
    const e = explanationsFor(rowByLabel(team, 'Stanoviště, rotace 1'));
    expect(e.perTable.map((x) => x?.name)).toEqual(['Udržení míče na pětce', 'Střelba jen z nastavení', 'Obrana do držení', 'Rozehrávka ze zadních tyčí']);
  });
  it('jedničky: rozehrání a řetězec', () => {
    expect(names(explanationsFor(rowByLabel(single, 'Rozehrání: rozehrávka ze zadku')).main)).toEqual(['Rozehrávka ze zadních tyčí']);
    expect(names(explanationsFor(rowByLabel(single, 'Řetězec (střídání po 10 pokusech)')).main)).toEqual(['Řetězec (trénink jedniček)']);
  });
  it('kritérium 8: každý text vysvětlivek je u nějakého bloku', () => {
    const shown = new Set<string>();
    for (const s of [team, single])
      for (const row of s.sections.flatMap((x) => x.rows)) {
        const e = explanationsFor(row);
        [...e.main, ...e.general, ...e.perTable].forEach((i) => i && shown.add(i.name));
      }
    expect([...shown].sort()).toEqual(EXPLANATIONS.flatMap((g) => g.items.map((i) => i.name)).sort());
  });
});
