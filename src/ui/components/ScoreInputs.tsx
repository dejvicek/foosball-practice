import { parseScoreValue } from '../../domain/standings';
import type { Score } from '../../domain/types';

interface Props {
  label: string;
  score: Score | undefined;
  maxGoals: number;
  withLosses: boolean;
  onChange(next: Score): void;
}

const show = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function ScoreInputs({ label, score, maxGoals, withLosses, onChange }: Props) {
  const s = score ?? {};
  const input = (field: keyof Score, max: number, title: string) => (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      placeholder="–"
      aria-label={`${label}: ${title}`}
      value={show(s[field])}
      onChange={(e) => onChange({ ...s, [field]: parseScoreValue(e.target.value) })}
    />
  );
  return (
    <div className="score">
      {input('ga', maxGoals, 'góly vlevo')}
      <span className="sep">:</span>
      {input('gb', maxGoals, 'góly vpravo')}
      {withLosses && (
        <>
          <span className="lbl">ztráty</span>
          {input('la', 30, 'ztráty vlevo')}
          <span className="sep">/</span>
          {input('lb', 30, 'ztráty vpravo')}
        </>
      )}
    </div>
  );
}
