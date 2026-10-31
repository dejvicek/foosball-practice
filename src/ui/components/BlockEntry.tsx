import { EXPLANATIONS } from '../../domain/content';
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

const ROUND_RULE = ['Normální leg', 'Daň za ztrátu', 'Zeď', 'Zeď', 'Start 0:3', 'Start 4:4', 'Start 5:5, o 2 góly, strop 10'];

function explanation(name: string): string[] {
  for (const g of EXPLANATIONS) {
    const it = g.items.find((i) => i.name === name);
    if (it) return it.parts.map((p) => (p.label ? `${p.label} ${p.text}` : p.text));
  }
  return [];
}

function ruleTexts(row: ScheduleRow): string[] {
  const m = row.cells.find((c) => c?.type === 'match');
  if (!m || m.type !== 'match') return [];
  if (m.match.block === 'sim') return explanation('Simulace ligového kola');
  const out = explanation(ROUND_RULE[m.match.round - 1] ?? '');
  if (m.match.round === 5) out.push(...explanation('Daň za ztrátu'));
  return out;
}

export function BlockEntry({ row, waitingLabel, training, names, onScore, onSolo }: Props) {
  const nm = (ids: PlayerId[]) => ids.map((id) => names[id] ?? '?').join(' + ');
  const rules = ruleTexts(row);
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
        {rules.map((r, i) => (
          <p key={i}>{r}</p>
        ))}
        {row.waiting.length > 0 && (
          <p className="muted">
            {waitingLabel}: {row.waiting.map((p) => names[p] ?? '?').join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
