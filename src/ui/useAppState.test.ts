import { act, renderHook, waitFor } from '@testing-library/react';
import { useAppState } from './useAppState';
import { memoryRepository } from '../storage/memoryRepository';
import type { Training } from '../domain/types';

const t: Training = { id: 't1', date: '2026-10-31', startTime: '18:00', soloResults: {}, mode: 'team', tables: 4, attendees: [], scores: {} };

describe('useAppState', () => {
  it('smazání tréninku zruší čekající zápis skóre (žádné nekonečné opakování)', async () => {
    const repo = memoryRepository({ players: [], trainings: [t] });
    const { result } = renderHook(() => useAppState(repo));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.saveScore('t1', 'm1', { ga: 6, gb: 1 }));
    act(() => result.current.deleteTraining('t1'));
    await new Promise((r) => setTimeout(r, 600));
    expect(result.current.saveState).toBe('idle');
    expect(repo.snapshot().trainings).toEqual([]);
  });

  it('vymazání skóre zruší čekající zápis, skóre se nevrátí', async () => {
    const repo = memoryRepository({ players: [], trainings: [t] });
    const { result } = renderHook(() => useAppState(repo));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.saveScore('t1', 'm1', { ga: 6, gb: 1 }));
    act(() => result.current.updateTrainingConfig({ ...t, scores: {} }));
    await new Promise((r) => setTimeout(r, 600));
    expect(repo.snapshot().trainings[0].scores).toEqual({});
    expect(result.current.data.trainings[0].scores).toEqual({});
  });
});
