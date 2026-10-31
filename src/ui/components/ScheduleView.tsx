import { clock } from '../../domain/content';
import type { Cell, MatchId, PlayerId, Schedule, ScheduleRow, ScheduleSection, Score } from '../../domain/types';
import { plural } from '../format';
import { ScoreInputs } from './ScoreInputs';

interface Props {
  schedule: Schedule;
  names: Record<PlayerId, string>;
  scores: Record<MatchId, Score>;
  playerCount: number;
  onScore(id: MatchId, s: Score): void;
}

const SCENARIO = /^Start /;

function cellLabel(row: ScheduleRow, table: number): string {
  return `${row.label}, stůl ${table}`;
}

function CellView({ cell, row, table, props }: { cell: Cell; row: ScheduleRow; table: number; props: Props }) {
  const nm = (ids: PlayerId[]) => ids.map((id) => props.names[id] ?? '?').join(' + ');
  if (cell.type === 'group') {
    return (
      <div className="slot">
        <span className="slot-no">Stůl {table}</span>
        <span className="group-names">{nm(cell.players)}</span>
        {cell.station && <span className="station">{cell.station}</span>}
      </div>
    );
  }
  const m = cell.match;
  const label = cellLabel(row, table);
  return (
    <div className="slot" role="group" aria-label={label}>
      <span className="slot-no">
        Stůl {table}, {m.kind === 'doubles' ? 'dvojice' : 'singl'}
      </span>
      <span className="visually-hidden">
        {nm(m.sideA)} vs {nm(m.sideB)}
      </span>
      <ScoreInputs
        label={label}
        score={props.scores[m.id]}
        maxGoals={m.block === 'sim' ? 2 : 10}
        withLosses={m.block === 'league'}
        sides={[nm(m.sideA), nm(m.sideB)]}
        onChange={(s) => props.onScore(m.id, s)}
      />
    </div>
  );
}

function RowView({ row, waitingLabel, props }: { row: ScheduleRow; waitingLabel: string; props: Props }) {
  const free = row.cells.map((c, j) => (c ? null : j + 1)).filter((x): x is number => x !== null);
  return (
    <li className={`round round-${row.kind}`} data-row>
      <div className="round-head">
        <span className="round-time">{clock(row.time)}</span>
        <span className="round-label">{row.label}</span>
        {row.rule && <span className="round-rule">{row.rule}</span>}
        {row.rule && SCENARIO.test(row.rule) && <span className="round-note">Zapisuj jen odehrané góly.</span>}
      </div>
      {row.kind !== 'break' && (
        <>
          <div className="slots">
            {row.cells.map((c, j) => (c ? <CellView key={j} cell={c} row={row} table={j + 1} props={props} /> : null))}
          </div>
          <p className="round-foot">
            {row.waiting.length > 0 && (
              <span>
                {waitingLabel}: {row.waiting.map((id) => props.names[id] ?? '?').join(', ')}
              </span>
            )}
            {free.length > 0 && row.kind === 'matches' && <span>Volné stoly: {free.join(', ')}</span>}
          </p>
        </>
      )}
    </li>
  );
}

function sectionNote(sec: ScheduleSection, s: Schedule, names: Record<PlayerId, string>, n: number): string[] {
  const sm = s.summary;
  switch (sec.id) {
    case 'solo':
      return [
        (sm.stationGroups < 4
          ? `Stanoviště se střídají jen ${sm.stationGroups} (podle počtu stolů a hráčů). Vynechaná stanoviště zařaďte příští trénink jako první.`
          : 'Každá skupina projde všechna 4 stanoviště, 8 minut na každém.') + ' Kdo ve skupině zrovna nehraje, počítá.',
      ];
    case 'league':
      return [
        `Každé kolo: ${sm.doublesPerRound} × dvojice${sm.singlesPerRound ? `, ${sm.singlesPerRound} × singl` : ''}${
          sm.waitingPerRound ? `, ${sm.waitingPerRound} rozhodčí` : ', nikdo nečeká, ztráty počítá brankář soupeře'
        }. Sestavy se každé kolo posouvají o jednoho hráče, takže se střídají spoluhráči, soupeři i role rozhodčího. Skóre: levá strana : pravá strana, ztráty stejně. U scénářových startů zapisuj jen góly odehrané v kole (od startovního stavu), ne stav na stole. Ztráty čárkuj v každém kole, i bez Daně. Kolo končí dohraným legem; když dřív vyprší čas, zapíše se aktuální stav.`,
      ];
    case 'sim': {
      const team = (ids: PlayerId[]) => ids.map((id) => names[id] ?? '?').join(', ');
      const out = [
        `Tým A: ${team(s.teams!.A)}. Tým B: ${team(s.teams!.B)}. Celkem ${sm.simDoubles} × dvojice a ${sm.simSingles} × singl. Výsledek se zapisuje v setech (2:0 nebo 2:1), levá strana je vždy tým A.`,
      ];
      if (n < 6)
        out.push(
          `Při ${n} hráčích je simulace kola spíš jeden ostrý zápas. Pokud chcete trénovat víc, hrajte po 1. vlně druhý zápas se stejnými sestavami a obraťte strany.`,
        );
      return out;
    }
    case 'singles':
      return [
        `Každé kolo ${sm.singlesPerRound} × singl${
          sm.waitingPerRound ? `, ${sm.waitingPerRound} počítá` : ', nikdo nečeká, ztráty počítá soupeř'
        }. Soupeř se mění každé kolo. Skóre: levá strana : pravá strana, ztráty stejně. U startu 0:3 zapisuj jen góly odehrané v kole. Ztráty čárkuj v každém kole, i bez Daně.`,
      ];
  }
}

export function ScheduleView(props: Props) {
  const { schedule: s } = props;
  const n = props.playerCount;
  const t = s.tables;
  return (
    <div className="schedule">
      <p className="perex">
        <strong>
          {n} {plural(n, 'hráč', 'hráči', 'hráčů')}, {t} stoly.
        </strong>{' '}
        {s.mode === 'team' ? 'Týmový trénink na 3 hodiny.' : 'Trénink jedniček, zhruba 80 minut.'}
        {s.mode === 'single' && n > 2 * t && ` Víc hráčů než míst na stolech: ${n - 2 * t} lidí každé kolo počítá, role se střídají.`}
        {s.mode === 'team' && n > 4 * t && ' Víc hráčů než míst pro dvojice na stolech, část hráčů každé kolo počítá nebo hraje singl.'}
      </p>
      {s.sections.map((sec) => (
        <section key={sec.id} className="sched-section">
          <h2>{sec.title}</h2>
          {sec.subtitle && <h3>{sec.subtitle}</h3>}
          <ol className="rounds">
            {sec.rows.map((r, i) => (
              <RowView key={i} row={r} waitingLabel={sec.waitingLabel} props={props} />
            ))}
          </ol>
          {sectionNote(sec, s, props.names, n).map((txt, i) => (
            <p key={i} className="note">
              {txt}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
