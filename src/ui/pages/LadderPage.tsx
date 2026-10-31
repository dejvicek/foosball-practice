import { computeLadder, FORM_DAYS, MIN_TRAININGS, type LadderRow, type LadderView } from '../../domain/ladder';
import { addDays } from '../../domain/dates';
import type { PlayerId } from '../../domain/types';
import type { UiPrefs } from '../../storage/prefs';
import { rangeText } from '../components/RangeLabel';
import { todayIso } from '../dates';
import { dec1, pct, signed } from '../format';
import type { AppStore } from '../useAppState';
import type { Route } from '../useHashRoute';

interface Props {
  store: AppStore;
  prefs: UiPrefs;
  setPrefs(p: UiPrefs): void;
  navigate(r: Route): void;
}

const dash = (v: number | null, f: (v: number) => string) => (v === null ? '–' : f(v));

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange(v: T): void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function LadderTable({
  rows,
  view,
  label,
  ranked,
  name,
  open,
}: {
  rows: LadderRow[];
  view: LadderView;
  label: string;
  ranked: boolean;
  name(id: PlayerId): string;
  open(id: PlayerId): void;
}) {
  const avg = view === 'avg';
  return (
    <div className="wrap">
      <table aria-label={label} className={ranked ? undefined : 'low-data'}>
        <thead>
          <tr>
            <th className="n">#</th>
            <th>Hráč</th>
            <th className="n">Tréninky</th>
            <th className="n">Legy</th>
            <th className="n">{avg ? 'Rozdíl / leg' : 'Rozdíl'}</th>
            <th className="n">{avg ? 'Výhry %' : 'Výhry'}</th>
            <th className="n">{avg ? 'Góly + / leg' : 'Góly +'}</th>
            <th className="n">{avg ? 'Góly − / leg' : 'Góly −'}</th>
            <th className="n">Ztráty / leg</th>
            <th className="n">{avg ? 'Simulace %' : 'Simulace (výhry / zápasy)'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const d = avg ? r.diffPerLeg : r.diff;
            return (
              <tr key={r.playerId}>
                <td className="n">{ranked ? `${i + 1}.` : '–'}</td>
                <td>
                  <button type="button" className="player-link" onClick={() => open(r.playerId)}>
                    {name(r.playerId)}
                  </button>
                </td>
                <td className="n">{r.trainings}</td>
                <td className="n">{r.legs}</td>
                <td className={d > 0 ? 'n pos' : d < 0 ? 'n neg' : 'n'}>{avg ? dec1(r.diffPerLeg, true) : signed(r.diff)}</td>
                <td className="n">{avg ? pct(r.winRate) : r.wins}</td>
                <td className="n">{avg ? dec1(r.gfPerLeg) : r.gf}</td>
                <td className="n">{avg ? dec1(r.gcPerLeg) : r.gc}</td>
                <td className="n">{dash(r.lossPerLeg, (v) => dec1(v))}</td>
                <td className="n">{avg ? dash(r.simRate, pct) : `${r.simW} / ${r.simM}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LadderPage({ store, prefs, setPrefs, navigate }: Props) {
  const today = todayIso();
  const { ladderRange: range, ladderView: view } = prefs;
  const { ranked, lowData } = computeLadder(store.data.trainings, range, view, today);
  const byId = new Map(store.data.players.map((p) => [p.id, p]));
  const name = (id: PlayerId) => {
    const p = byId.get(id);
    return p ? (p.archived ? `${p.name} (archiv)` : p.name) : '?';
  };
  const open = (id: PlayerId) => navigate({ page: 'player', id });

  const setRangeKind = (kind: 'form' | 'all' | 'custom') => {
    if (kind === 'custom') {
      const from = range.kind === 'custom' ? range.from : addDays(today, -(FORM_DAYS - 1));
      const to = range.kind === 'custom' ? range.to : today;
      setPrefs({ ...prefs, ladderRange: { kind, from, to } });
    } else setPrefs({ ...prefs, ladderRange: { kind } });
  };

  return (
    <section>
      <h1>Žebříček</h1>
      <div>
        <Seg
          label="Období"
          value={range.kind}
          onChange={setRangeKind}
          options={[
            ['form', `Forma (${FORM_DAYS} dní)`],
            ['all', 'Celkově'],
            ['custom', 'Od–do'],
          ]}
        />
        <Seg label="Zobrazení" value={view} onChange={(v) => setPrefs({ ...prefs, ladderView: v })} options={[['avg', 'Průměr'], ['total', 'Celkem']]} />
      </div>
      {range.kind === 'custom' && (
        <div className="range-dates">
          <label htmlFor="r-from">Od</label>
          <input id="r-from" type="date" value={range.from} onChange={(e) => e.target.value && setPrefs({ ...prefs, ladderRange: { ...range, from: e.target.value } })} />
          <label htmlFor="r-to">Do</label>
          <input id="r-to" type="date" value={range.to} onChange={(e) => e.target.value && setPrefs({ ...prefs, ladderRange: { ...range, to: e.target.value } })} />
        </div>
      )}
      <p className="dateline">{rangeText(range, today)}</p>

      {ranked.length === 0 && lowData.length === 0 ? (
        <p className="note">V tomhle období zatím nejsou žádné zapsané legy.</p>
      ) : (
        <>
          {ranked.length > 0 ? (
            <LadderTable rows={ranked} view={view} label="Žebříček" ranked name={name} open={open} />
          ) : (
            <p className="note">Nikdo zatím nemá v tomhle období aspoň {MIN_TRAININGS} tréninky.</p>
          )}
          {lowData.length > 0 && (
            <>
              <h3>Málo dat (méně než {MIN_TRAININGS} tréninky)</h3>
              <LadderTable rows={lowData} view={view} label="Málo dat" ranked={false} name={name} open={open} />
            </>
          )}
          <p className="note">
            {view === 'avg'
              ? 'Průměr: pořadí dělá rozdíl skóre na leg, pak procento výher, góly na leg a úspěšnost v simulaci. Hráči s méně než 2 tréninky v období se neřadí.'
              : 'Celkem: pořadí dělá součet rozdílu skóre, pak výhry, góly a výhry v simulaci.'}{' '}
            Počítají se jen zapsané legy ze scénářové ligy a jedniček; simulace kola zvlášť.
          </p>
        </>
      )}
    </section>
  );
}
