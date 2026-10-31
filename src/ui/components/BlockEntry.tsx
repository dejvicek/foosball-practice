import type { ExplanationItem } from '../../domain/content';
import { explanationsFor } from '../../domain/explain';
import { parseScoreValue } from '../../domain/standings';
import { soloMetric } from '../../domain/solo';
import type { MatchId, PlayerId, ScheduleRow, Score, SoloMetric, Training } from '../../domain/types';
import { ScoreInputs } from './ScoreInputs';

interface Props {
  row: ScheduleRow;
  waitingLabel: string;
  training: Training;
  names: Record<PlayerId, string>;
  onScore(id: MatchId, s: Score): void;
  onSolo(playerId: PlayerId, metric: SoloMetric, value: number | null): void;
}

function ItemText({ item, skipCounting = false }: { item: ExplanationItem; skipCounting?: boolean }) {
  return (
    <>
      {item.parts
        .filter((p) => !(skipCounting && p.label === 'Počítá se:'))
        .map((p, i) => (
          <p key={i}>
            {p.label && <span className="k">{p.label}</span>} {p.text}
          </p>
        ))}
    </>
  );
}

export function BlockEntry({ row, waitingLabel, training, names, onScore, onSolo }: Props) {
  const nm = (ids: PlayerId[]) => ids.map((id) => names[id] ?? '?').join(' + ');
  const ex = explanationsFor(row);
  const scenario = /^Start /.test(row.rule ?? '');
  return (
    <div className="block-entry">
      <div className="entry-cards">
        {row.cells.map((c, j) => {
          if (!c) return null;
          const label = `${row.label}, stůl ${j + 1}`;
          if (c.type === 'match') {
            const m = c.match;
            return (
              <div key={j} className="entry-card" role="group" aria-label={label}>
                <div className="entry-head">
                  Stůl {j + 1}, {m.kind === 'doubles' ? 'dvojice' : 'singl'}
                  {m.block === 'sim' && ', sety'}
                </div>
                <span className="visually-hidden">
                  {nm(m.sideA)} vs {nm(m.sideB)}
                </span>
                <ScoreInputs
                  label={label}
                  score={training.scores[m.id]}
                  maxGoals={m.block === 'sim' ? 2 : 10}
                  withLosses={!!m.trackLosses}
                  sides={[nm(m.sideA), nm(m.sideB)]}
                  start={m.start}
                  wall={m.wall}
                  onChange={(s) => onScore(m.id, s)}
                />
                {m.block === 'league' && (
                  <p className="entry-ref">
                    {m.lossTax
                      ? `Ztráty jsou v gólech (Daň za ztrátu).${m.referee ? ` Rozhodčí: ${names[m.referee] ?? '?'}` : ''}`
                      : m.referee
                        ? `Rozhodčí: ${names[m.referee] ?? '?'}, čárkuje ztráty`
                        : 'Bez rozhodčího, ztráty se nezapisují'}
                  </p>
                )}
              </div>
            );
          }
          if (!c.metric) return null;
          const def = soloMetric(c.metric);
          return (
            <div key={j} className="entry-card" role="group" aria-label={label}>
              <div className="entry-head">Stůl {j + 1}</div>
              <div className="entry-metric">
                <strong>{def.name}</strong>
                <span>{def.what}</span>
              </div>
              {ex.perTable[j] && (
                <div className="entry-explain">
                  <ItemText item={ex.perTable[j]!} skipCounting />
                </div>
              )}
              {c.players.map((p) => {
                const v = training.soloResults[p]?.[c.metric!];
                return (
                  <label key={p} className="solo-line">
                    <span>{names[p] ?? '?'}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={def.max}
                      placeholder="–"
                      aria-label={`${label}: ${names[p] ?? '?'}`}
                      value={v === undefined ? '' : String(v)}
                      onChange={(e) => {
                        const n = parseScoreValue(e.target.value);
                        if (n !== null && n > def.max) return;
                        onSolo(p, c.metric!, n);
                      }}
                    />
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="entry-foot">
        {scenario && <p className="entry-warn">Zapiš konečný stav na stole, startovní góly appka odečte sama.</p>}
        {ex.main.map((it) => (
          <div key={it.name} className="entry-rule">
            <strong>{it.name}</strong>
            <ItemText item={it} />
          </div>
        ))}
        {ex.general.length > 0 && (
          <details className="entry-general">
            <summary>Obecná pravidla: {ex.general.map((g) => g.name.toLocaleLowerCase('cs')).join(', ')}</summary>
            {ex.general.map((it) => (
              <div key={it.name} className="entry-rule">
                <strong>{it.name}</strong>
                <ItemText item={it} />
              </div>
            ))}
          </details>
        )}
        {row.waiting.length > 0 && (
          <p className="muted">
            {waitingLabel}: {row.waiting.map((p) => names[p] ?? '?').join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
