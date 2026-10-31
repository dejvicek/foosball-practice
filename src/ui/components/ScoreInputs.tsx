import type { ReactNode } from 'react';
import { parseScoreValue } from '../../domain/standings';
import type { Score } from '../../domain/types';

interface Props {
  label: string;
  score: Score | undefined;
  maxGoals: number;
  withLosses: boolean;
  /** Jména levé a pravé strany; zobrazí se u svého políčka skóre. */
  sides?: [ReactNode, ReactNode];
  onChange(next: Score): void;
}

const show = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function ScoreInputs({ label, score, maxGoals, withLosses, sides, onChange }: Props) {
  const s = score ?? {};
  const input = (field: keyof Score, max: number, title: string, className: string) => (
    <input
      className={className}
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      placeholder="–"
      aria-label={`${label}: ${title}`}
      value={show(s[field])}
      onChange={(e) => {
        const v = parseScoreValue(e.target.value);
        if (v !== null && v > max) return; // překlep nad maximum se nepřijme
        onChange({ ...s, [field]: v });
      }}
    />
  );
  const ga = s.ga ?? null;
  const gb = s.gb ?? null;
  const done = ga !== null && gb !== null;
  const won = (mine: number | null, theirs: number | null) => (done && (mine as number) > (theirs as number) ? ' won' : '');
  return (
    <div className="result">
      <div className={`result-side${won(ga, gb)}`}>
        <span className="side-tag" aria-hidden="true">L</span>
        <span className="side-name">{sides?.[0]}</span>
        {input('ga', maxGoals, 'góly vlevo', 'goal')}
      </div>
      <div className={`result-side${won(gb, ga)}`}>
        <span className="side-tag" aria-hidden="true">P</span>
        <span className="side-name">{sides?.[1]}</span>
        {input('gb', maxGoals, 'góly vpravo', 'goal')}
      </div>
      {withLosses && (
        <div className="losses">
          <span>Ztráty</span>
          {input('la', 30, 'ztráty vlevo', 'loss')}
          <span aria-hidden="true">/</span>
          {input('lb', 30, 'ztráty vpravo', 'loss')}
        </div>
      )}
    </div>
  );
}
