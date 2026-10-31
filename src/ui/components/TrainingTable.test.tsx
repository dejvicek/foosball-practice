import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { memoryRepository } from '../../storage/memoryRepository';
import type { Mode, Player, TableCount, Training } from '../../domain/types';

const players = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `id${i + 1}`, name: `H${i + 1}`, order: i, archived: false }));
const training = (n: number, mode: Mode, tables: TableCount): Training => ({
  id: 't1', date: '2026-10-31', startTime: '18:00', mode, tables,
  attendees: players(n).map((p) => p.id), scores: {}, soloResults: {},
});
const rowOf = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) }).closest('tr')!;

afterEach(() => vi.useRealTimers());

describe('tabulka tréninku', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 5, 12, 0)); // jiný den než trénink
    window.location.hash = '#/trenink/t1';
  });

  it('skutečné časy, rozbalení kola a zápis skóre', async () => {
    const user = userEvent.setup();
    const repo = memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] });
    render(<App repo={repo} />);
    await screen.findByRole('table', { name: 'Rozpis tréninku' });
    expect(within(rowOf('Kolo 1')).getByText('19:00')).toBeInTheDocument();
    expect(rowOf('Kolo 1')).toHaveTextContent('H1 + H2 vs H3 + H4');

    // jiný den → rozbalený je první blok s chybějícím zápisem (rozehrání)
    expect(screen.getByLabelText('Rozehrání s počítáním, stůl 1: H1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Kolo 1/ }));
    const cell = screen.getByRole('group', { name: 'Kolo 1, stůl 1' });
    await user.type(within(cell).getByLabelText('Kolo 1, stůl 1: góly vlevo'), '6');
    await user.type(within(cell).getByLabelText('Kolo 1, stůl 1: góly vpravo'), '2');
    expect(rowOf('Kolo 1')).toHaveTextContent('6:2');
    const first = within(screen.getByRole('table', { name: 'Souhrn tréninku' })).getAllByRole('row')[1];
    expect(first).toHaveTextContent('H1');
    expect(first).toHaveTextContent('+4');
    await vi.waitFor(() => expect(repo.snapshot().trainings[0].scores['league|1|1|id1+id2vid3+id4']).toEqual({ ga: 6, gb: 2 }));
  });

  it('zápis stanoviště: rotace 2, stůl 1 = H4 na pětce; nad max se nepřijme', async () => {
    const user = userEvent.setup();
    const repo = memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] });
    render(<App repo={repo} />);
    await screen.findByRole('table', { name: 'Rozpis tréninku' });
    await user.click(screen.getByRole('button', { name: /^Stanoviště, rotace 2/ }));
    const input = screen.getByLabelText('Stanoviště, rotace 2, stůl 1: H4');
    await user.type(input, '3');
    await vi.waitFor(() => expect(repo.snapshot().trainings[0].soloResults).toEqual({ id4: { fiveBarControl: 3 } }));
    await user.clear(input);
    await user.type(input, '11');
    expect(input).toHaveValue(1);
    expect(rowOf('Stanoviště, rotace 2')).toHaveTextContent('zapsáno 1 z 8');
  });

  it('změna začátku posune časy', async () => {
    render(<App repo={memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] })} />);
    await screen.findByRole('table', { name: 'Rozpis tréninku' });
    fireEvent.change(screen.getByLabelText('Začátek'), { target: { value: '17:30' } });
    expect(within(rowOf('Kolo 1')).getByText('18:30')).toBeInTheDocument();
  });

  it('jedničky n=5: v kole 1 počítá H5', async () => {
    render(<App repo={memoryRepository({ players: players(5), trainings: [training(5, 'single', 2)] })} />);
    await screen.findByRole('table', { name: 'Rozpis tréninku' });
    expect(rowOf('Kolo 1')).toHaveTextContent('H5');
  });

  it('n=8, t=4: kolo 1 má volné stoly 3 a 4', async () => {
    render(<App repo={memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] })} />);
    await screen.findByRole('table', { name: 'Rozpis tréninku' });
    expect(within(rowOf('Kolo 1')).getAllByText('volný')).toHaveLength(2);
  });
});

describe('tabulka tréninku – dnes', () => {
  it('v 19:21 je zvýrazněné a rozbalené Kolo 3', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 31, 19, 21));
    window.location.hash = '#/trenink/t1';
    render(<App repo={memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] })} />);
    await screen.findByRole('table', { name: 'Rozpis tréninku' });
    expect(rowOf('Kolo 3')).toHaveClass('current');
    expect(rowOf('Kolo 2')).toHaveClass('past');
    const entry = screen.getByRole('group', { name: 'Kolo 3, stůl 1' }).closest<HTMLElement>('.block-entry')!;
    expect(within(entry).getByText(/Jeden tým má celý leg zakázáno riskovat/)).toBeInTheDocument();
  });
});
