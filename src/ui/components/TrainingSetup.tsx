import { useState } from 'react';
import { sortedRoster, type RosterError } from '../../domain/roster';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/schedule';
import { moveAttendee, toggleAttendee } from '../../domain/training';
import type { Mode, Player, TableCount, Training } from '../../domain/types';
import { MODE_OPTION, plural } from '../format';
import { ROSTER_ERRORS } from '../pages/PlayersPage';

interface Props {
  training: Training;
  players: Player[];
  onChange(next: Training): void;
  /** Přidá hráče do soupisky a vrátí jeho ID, nebo chybu. */
  onAddPlayer(name: string): { id: string } | { error: RosterError };
}

export function TrainingSetup({ training, players, onChange, onAddPlayer }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const n = training.attendees.length;
  const byId = new Map(players.map((p) => [p.id, p]));

  // Aktivní hráči + archivovaní, kteří už v tréninku jsou.
  const shown = sortedRoster(players).filter((p) => !p.archived || training.attendees.includes(p.id));

  const add = () => {
    const r = onAddPlayer(name);
    if ('error' in r) return setError(ROSTER_ERRORS[r.error]);
    setName('');
    setError(null);
  };

  return (
    <div className="no-print">
      <div className="setup">
        <div className="field">
          <label htmlFor="t-date">Datum</label>
          <input id="t-date" type="date" value={training.date} onChange={(e) => e.target.value && onChange({ ...training, date: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="t-mode">Typ tréninku</label>
          <select id="t-mode" value={training.mode} onChange={(e) => onChange({ ...training, mode: e.target.value as Mode })}>
            <option value="team">{MODE_OPTION.team}</option>
            <option value="single">{MODE_OPTION.single}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="t-tables">Počet stolů</label>
          <select id="t-tables" value={training.tables} onChange={(e) => onChange({ ...training, tables: Number(e.target.value) as TableCount })}>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>

      <div className="attendance">
        <div className="attendance-head">
          <h2>Přítomní</h2>
          <span className="count-badge">Přítomno: {n}</span>
        </div>
        {n < MIN_PLAYERS && (
          <p className="note">
            Ještě chybí {MIN_PLAYERS - n} {plural(MIN_PLAYERS - n, 'hráč', 'hráči', 'hráčů')} do minima {MIN_PLAYERS}.
          </p>
        )}
        {n > MAX_PLAYERS && <p className="error">Moc hráčů: rozpis umí nejvýš {MAX_PLAYERS}.</p>}
        <ul className="check-list">
          {shown.map((p) => (
            <li key={p.id}>
              <label>
                <input
                  type="checkbox"
                  checked={training.attendees.includes(p.id)}
                  onChange={() => onChange(toggleAttendee(training, p.id, players))}
                />
                <span>
                  {p.name}
                  {p.archived && <span className="archived-tag"> (archiv)</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <form
          className="add-form"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label htmlFor="t-new-player">Jméno nového hráče</label>
          <div className="add-row">
            <input id="t-new-player" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            <button type="submit">Přidat a zaškrtnout</button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      {n > 1 && (
        <details>
          <summary>Upravit pořadí</summary>
          <p className="note">
            Pořadí je nominační pořadí pro simulaci kola: první polovina je tým A, druhá tým B, a kdo je v týmu výš, jde dřív do singlu.
          </p>
          <ol className="order-list">
            {training.attendees.map((id, i) => {
              const nm = byId.get(id)?.name ?? '?';
              return (
                <li key={id}>
                  <span className="pos">{i + 1}.</span>
                  <span className="nm">{nm}</span>
                  <button type="button" className="icon" aria-label={`Posunout ${nm} v pořadí nahoru`} disabled={i === 0} onClick={() => onChange(moveAttendee(training, id, -1))}>
                    ↑
                  </button>
                  <button type="button" className="icon" aria-label={`Posunout ${nm} v pořadí dolů`} disabled={i === n - 1} onClick={() => onChange(moveAttendee(training, id, 1))}>
                    ↓
                  </button>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </div>
  );
}
