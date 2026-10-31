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
      <>
        {nm(cell.players)}
        {cell.station && <span className="rule">{cell.station}</span>}
      </>
    );
  }
  const m = cell.match;
  const label = cellLabel(row, table);
  return (
    <div role="group" aria-label={label}>
      <span className="match-players">
        {nm(m.sideA)} <span className="vs">vs</span> {nm(m.sideB)}
      </span>
      <span className="rule">{m.kind === 'doubles' ? 'dvojice' : 'singl'}</span>
      <ScoreInputs
        label={label}
        score={props.scores[m.id]}
        maxGoals={m.block === 'sim' ? 2 : 10}
        withLosses={m.block === 'league'}
        onChange={(s) => props.onScore(m.id, s)}
      />
    </div>
  );
}

function RowView({ row, tables, props }: { row: ScheduleRow; tables: number; props: Props }) {
  const head = (
    <>
      <td className="t">{clock(row.time)}</td>
      <td className="b">
        {row.label}
        {row.rule && <span className="rule">{row.rule}</span>}
        {row.rule && SCENARIO.test(row.rule) && <span className="rule">Zapisuj jen odehrané góly.</span>}
      </td>
    </>
  );
  if (row.kind === 'break') {
    return (
      <tr>
        {head}
        <td className="free" colSpan={tables + 1} />
      </tr>
    );
  }
  return (
    <tr>
      {head}
      {row.cells.map((c, j) =>
        c ? (
          <td key={j}>
            <CellView cell={c} row={row} table={j + 1} props={props} />
          </td>
        ) : (
          <td key={j} className="free">
            volný
          </td>
        ),
      )}
      <td className="wait">{row.waiting.length ? row.waiting.map((id) => props.names[id] ?? '?').join(', ') : '–'}</td>
    </tr>
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
      <div className="summary-box">
        <p>
          <strong>
            {n} {plural(n, 'hráč', 'hráči', 'hráčů')}, {t} stoly
          </strong>
          : {s.mode === 'team' ? 'týmový trénink, 3 hodiny' : 'trénink jedniček, zhruba 80 minut'}.
        </p>
        {s.mode === 'single' && n > 2 * t && (
          <p>Víc hráčů než míst na stolech: {n - 2 * t} lidí každé kolo počítá, role se střídají.</p>
        )}
        {s.mode === 'team' && n > 4 * t && <p>Víc hráčů než míst pro dvojice na stolech, část hráčů každé kolo počítá nebo hraje singl.</p>}
      </div>
      {s.sections.map((sec) => (
        <section key={sec.id}>
          <h2>{sec.title}</h2>
          {sec.subtitle && <h3>{sec.subtitle}</h3>}
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Čas</th>
                  <th>Blok</th>
                  {Array.from({ length: t }, (_, j) => (
                    <th key={j}>Stůl {j + 1}</th>
                  ))}
                  <th>{sec.waitingLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((r, i) => (
                  <RowView key={i} row={r} tables={t} props={props} />
                ))}
              </tbody>
            </table>
          </div>
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
