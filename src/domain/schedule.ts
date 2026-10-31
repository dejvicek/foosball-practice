import { assign, type Pairing } from './assign';
import { ROUNDS, STATIONS, TIMES } from './content';
import { groups, rotate } from './rotation';
import { buildSimulation } from './simulation';
import type {
  Block,
  Cell,
  Match,
  MatchId,
  PlayerId,
  Schedule,
  ScheduleRow,
  ScheduleSection,
  ScheduleSummary,
  TableCount,
  Training,
} from './types';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 13;

export type ScheduleInput = Pick<Training, 'mode' | 'tables' | 'attendees'>;

export function canBuildSchedule(t: ScheduleInput): boolean {
  return t.attendees.length >= MIN_PLAYERS && t.attendees.length <= MAX_PLAYERS;
}

export function matchId(block: Block, round: number, table: number, a: PlayerId[], b: PlayerId[]): MatchId {
  return `${block}|${round}|${table}|${a.join('+')}v${b.join('+')}`;
}

function cellsOf(items: (Cell | null)[], tables: TableCount): (Cell | null)[] {
  return Array.from({ length: tables }, (_, j) => items[j] ?? null);
}

function breakRow(time: number, label: string, tables: TableCount, rule?: string): ScheduleRow {
  return { time, label, rule, kind: 'break', cells: cellsOf([], tables), waiting: [] };
}

function matchRow(
  block: Block,
  round: number,
  pairings: Pairing[],
  waiting: PlayerId[],
  time: number,
  label: string,
  rule: string,
  tables: TableCount,
  out: Match[],
): ScheduleRow {
  const cells: Cell[] = pairings.map((p, j) => {
    const match: Match = {
      id: matchId(block, round, j + 1, p.a, p.b),
      block,
      round,
      table: j + 1,
      kind: p.kind,
      sideA: p.a,
      sideB: p.b,
    };
    out.push(match);
    return { type: 'match', match };
  });
  return { time, label, rule, kind: 'matches', cells: cellsOf(cells, tables), waiting };
}

/** PRD 5.1: skupiny pro rozehrání / stanoviště. */
function groupRows(
  players: PlayerId[],
  tables: TableCount,
  start: number,
  slotMin: number,
  label: (r: number) => string,
  withStations: boolean,
): { rows: ScheduleRow[]; g: number; end: number } {
  const g = Math.min(tables, Math.floor(players.length / 2));
  const gr = groups(players, g);
  const rotations = withStations ? g : 1;
  const rows: ScheduleRow[] = [];
  for (let r = 0; r < rotations; r++) {
    const cells: Cell[] = [];
    for (let j = 0; j < g; j++) {
      const gi = (((j - r) % g) + g) % g;
      cells.push(
        withStations ? { type: 'group', players: gr[gi], station: STATIONS[j] } : { type: 'group', players: gr[gi] },
      );
    }
    rows.push({ time: start + r * slotMin, label: label(r), kind: 'groups', cells: cellsOf(cells, tables), waiting: [] });
  }
  return { rows, g, end: start + rotations * slotMin };
}

function buildTeam(players: PlayerId[], tables: TableCount): Schedule {
  const matches: Match[] = [];
  const t = TIMES.team;

  const warm = groupRows(players, tables, 0, t.warmup, () => 'Rozehrání s počítáním', false);
  const st = groupRows(players, tables, t.warmup, t.stationSlot, (r) => `Stanoviště, rotace ${r + 1}`, true);
  const solo: ScheduleSection = {
    id: 'solo',
    title: 'Část 1: Sólový trénink',
    waitingLabel: 'Počítá',
    rows: [...warm.rows, ...st.rows, breakRow(st.end, 'Pauza', tables)],
  };

  const leagueRows: ScheduleRow[] = [];
  let start = t.leagueStart;
  let first = { doubles: 0, singles: 0, waiting: 0 };
  ROUNDS.forEach((rd, k) => {
    const a = assign(rotate(players, k), tables, false);
    leagueRows.push(
      matchRow('league', k + 1, a.tables, a.waiting, start, `Kolo ${k + 1}`, `${rd.name}, ${rd.min} min`, tables, matches),
    );
    if (k === 0) {
      const d = a.tables.filter((x) => x.kind === 'doubles').length;
      first = { doubles: d, singles: a.tables.length - d, waiting: a.waiting.length };
    }
    start += rd.min + t.changeover;
  });
  leagueRows.push(breakRow(start, 'Pauza', tables));
  const league: ScheduleSection = {
    id: 'league',
    title: 'Část 2: Zápasový trénink',
    subtitle: 'Scénářová liga',
    waitingLabel: 'Rozhodčí / počítá',
    rows: leagueRows,
  };

  const sim = buildSimulation(players, tables);
  const simStart = start + t.simBreak;
  const waveRule = `${t.wave} min, ligový formát`;
  const simSection: ScheduleSection = {
    id: 'sim',
    title: 'Simulace ligového kola',
    waitingLabel: 'Čeká',
    rows: [
      matchRow('sim', 1, sim.wave1.matches, [...sim.wave1.restA, ...sim.wave1.restB], simStart, '1. vlna', waveRule, tables, matches),
      matchRow('sim', 2, sim.wave2.matches, [...sim.wave2.restA, ...sim.wave2.restB], simStart + t.wave, '2. vlna', waveRule, tables, matches),
      breakRow(simStart + t.evaluationOffset, 'Vyhodnocení a zápis', tables, '15 min'),
    ],
  };

  const summary: ScheduleSummary = {
    stationGroups: st.g,
    doublesPerRound: first.doubles,
    singlesPerRound: first.singles,
    waitingPerRound: first.waiting,
    simDoubles: sim.wave1.doubles + sim.wave2.doubles,
    simSingles: sim.wave1.singles + sim.wave2.singles,
  };

  return {
    mode: 'team',
    tables,
    sections: [solo, league, simSection],
    matches,
    teams: { A: sim.A, B: sim.B },
    summary,
  };
}

function buildSingles(players: PlayerId[], tables: TableCount): Schedule {
  const matches: Match[] = [];
  const t = TIMES.single;
  const warm = groupRows(players, tables, 0, t.warmup, () => 'Rozehrání: rozehrávka ze zadku', false);
  const chain = groupRows(players, tables, t.warmup, t.chain, () => 'Řetězec (střídání po 10 pokusech)', false);
  const rows: ScheduleRow[] = [...warm.rows, ...chain.rows];
  let start = t.leagueStart;
  let first = { singles: 0, waiting: 0 };
  ROUNDS.slice(0, 5).forEach((rd, k) => {
    const a = assign(rotate(players, k), tables, true);
    rows.push(matchRow('league', k + 1, a.tables, a.waiting, start, `Kolo ${k + 1}`, `${rd.name}, ${rd.min} min`, tables, matches));
    if (k === 0) first = { singles: a.tables.length, waiting: a.waiting.length };
    start += rd.min + t.changeover;
  });
  rows.push(breakRow(start, 'Zápis', tables, `${t.recordMin} min`));
  return {
    mode: 'single',
    tables,
    sections: [{ id: 'singles', title: 'Trénink jedniček', waitingLabel: 'Počítá', rows }],
    matches,
    teams: null,
    summary: {
      stationGroups: warm.g,
      doublesPerRound: 0,
      singlesPerRound: first.singles,
      waitingPerRound: first.waiting,
      simDoubles: 0,
      simSingles: 0,
    },
  };
}

/** Čistá funkce: trénink → rozpis. Stejný vstup = stejný rozpis. */
export function buildSchedule(t: ScheduleInput): Schedule {
  if (!canBuildSchedule(t)) {
    throw new Error(`Rozpis umí ${MIN_PLAYERS}–${MAX_PLAYERS} hráčů, přítomno ${t.attendees.length}.`);
  }
  return t.mode === 'team' ? buildTeam(t.attendees, t.tables) : buildSingles(t.attendees, t.tables);
}
