import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { memoryRepository } from '../../storage/memoryRepository';
import type { Mode, Player, TableCount, Training } from '../../domain/types';

const players = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `id${i + 1}`, name: `H${i + 1}`, order: i, archived: false }));
const training = (n: number, mode: Mode, tables: TableCount): Training => ({
  id: 't1', date: '2026-10-31', mode, tables, attendees: players(n).map((p) => p.id), scores: {},
});

beforeEach(() => {
  window.location.hash = '#/trenink/t1';
});

describe('rozpis se zápisem skóre', () => {
  it('týmový n=8: kolo 1 v 1:00, zápis skóre přepočte souhrn a uloží se', async () => {
    const user = userEvent.setup();
    const repo = memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] });
    const { unmount } = render(<App repo={repo} />);

    const cell = await screen.findByRole('group', { name: 'Kolo 1, stůl 1' });
    expect(cell).toHaveTextContent('H1 + H2 vs H3 + H4');
    const row = cell.closest<HTMLElement>('[data-row]')!;
    expect(within(row).getByText('1:00')).toBeInTheDocument();

    const left = within(cell).getByLabelText('Kolo 1, stůl 1: góly vlevo');
    await user.type(left, '6');
    await user.type(within(cell).getByLabelText('Kolo 1, stůl 1: góly vpravo'), '2');
    expect(document.activeElement).toBe(within(cell).getByLabelText('Kolo 1, stůl 1: góly vpravo'));

    const standings = screen.getByRole('table', { name: 'Souhrn tréninku' });
    const firstRow = within(standings).getAllByRole('row')[1];
    expect(firstRow).toHaveTextContent('H1');
    expect(firstRow).toHaveTextContent('+4');

    await vi.waitFor(() =>
      expect(repo.snapshot().trainings[0].scores['league|1|1|id1+id2vid3+id4']).toEqual({ ga: 6, gb: 2 }),
    );
    unmount();
    render(<App repo={repo} />);
    const again = await screen.findByRole('group', { name: 'Kolo 1, stůl 1' });
    expect(within(again).getByLabelText('Kolo 1, stůl 1: góly vlevo')).toHaveValue(6);
  });

  it('jedničky n=5, t=2: v kole 1 počítá H5', async () => {
    render(<App repo={memoryRepository({ players: players(5), trainings: [training(5, 'single', 2)] })} />);
    const cell = await screen.findByRole('group', { name: 'Kolo 1, stůl 1' });
    expect(within(cell.closest<HTMLElement>('[data-row]')!).getByText('Počítá: H5')).toBeInTheDocument();
  });

  it('n=8, t=4: kolo 1 ukazuje volné stoly 3 a 4', async () => {
    render(<App repo={memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] })} />);
    const cell = await screen.findByRole('group', { name: 'Kolo 1, stůl 1' });
    expect(within(cell.closest<HTMLElement>('[data-row]')!).getByText('Volné stoly: 3, 4')).toBeInTheDocument();
  });

  it('vysvětlivky a poznámka o scénářových startech', async () => {
    render(<App repo={memoryRepository({ players: players(8), trainings: [training(8, 'team', 4)] })} />);
    expect(await screen.findByText('Vysvětlivky: stanoviště, pravidla a scénáře')).toBeInTheDocument();
    expect(screen.getAllByText(/zapisuj jen góly odehrané v kole/i).length).toBeGreaterThan(0);
  });
});
