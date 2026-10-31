import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppState } from './useAppState';
import { memoryRepository } from '../storage/memoryRepository';

describe('useAppState – trvalá chyba zápisu', () => {
  it('neblokuje frontu: zápis se zahodí, další projdou, data se znovu načtou a ukáže se chyba', async () => {
    const repo = memoryRepository({ players: [], trainings: [] }, { failPermanent: 1 });
    const { result } = renderHook(() => useAppState(repo));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.savePlayer({ id: 'a', name: 'Honza', archived: false, order: 0 }));
    act(() => result.current.savePlayer({ id: 'b', name: 'Petr', archived: false, order: 1 }));
    await waitFor(() => expect(result.current.saveState).toBe('idle'));
    expect(repo.snapshot().players.map((p) => p.name)).toEqual(['Petr']);
    await waitFor(() => expect(result.current.data.players.map((p) => p.name)).toEqual(['Petr']));
    expect(result.current.saveError).toMatch(/nepodařilo uložit/);
    act(() => result.current.dismissSaveError());
    expect(result.current.saveError).toBeNull();
  });
});
