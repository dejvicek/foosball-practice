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
      onChange={(e) => {
        const v = parseScoreValue(e.target.value);
        if (v !== null && v > max) return; // překlep nad maximum se nepřijme
        onChange({ ...s, [field]: v });
      }}
    />
  );
  return (
    <div className="score">
      <span className="score-pair">
        {input('ga', maxGoals, 'góly vlevo')}
        <span className="sep">:</span>
        {input('gb', maxGoals, 'góly vpravo')}
      </span>
      {withLosses && (
        <span className="score-pair">
          <span className="lbl">ztráty</span>
          {input('la', 30, 'ztráty vlevo')}
          <span className="sep">/</span>
          {input('lb', 30, 'ztráty vpravo')}
        </span>
      )}
    </div>
  );
}
