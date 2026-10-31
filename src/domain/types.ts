export type PlayerId = string;
export type MatchId = string;
export type Mode = 'team' | 'single';
export type TableCount = 2 | 3 | 4;

export interface Player {
  id: PlayerId;
  name: string;
  archived: boolean;
  order: number;
}

/** Skóre zápasu: ga/gb góly (u simulace sety 0..2), la/lb ztráty. */
export interface Score {
  ga?: number | null;
  gb?: number | null;
  la?: number | null;
  lb?: number | null;
}

export interface Training {
  id: string;
  date: string; // YYYY-MM-DD
  mode: Mode;
  tables: TableCount;
  /** Přítomní v nominačním pořadí. */
  attendees: PlayerId[];
  scores: Record<MatchId, Score>;
  notes?: string;
}

export type Block = 'league' | 'sim';
export type MatchKind = 'doubles' | 'singles';

export interface Match {
  id: MatchId;
  block: Block;
  round: number;
  table: number;
  kind: MatchKind;
  sideA: PlayerId[];
  sideB: PlayerId[];
}

export type Cell =
  | { type: 'group'; players: PlayerId[]; station?: string }
  | { type: 'match'; match: Match };

export interface ScheduleRow {
  time: number; // minuty od začátku tréninku
  label: string;
  rule?: string;
  kind: 'groups' | 'matches' | 'break';
  cells: (Cell | null)[];
  waiting: PlayerId[];
}

export interface ScheduleSection {
  id: 'solo' | 'league' | 'sim' | 'singles';
  title: string;
  subtitle?: string;
  waitingLabel: string;
  rows: ScheduleRow[];
}

export interface ScheduleSummary {
  stationGroups: number;
  doublesPerRound: number;
  singlesPerRound: number;
  waitingPerRound: number;
  simDoubles: number;
  simSingles: number;
}

export interface Schedule {
  mode: Mode;
  tables: TableCount;
  sections: ScheduleSection[];
  matches: Match[];
  teams: { A: PlayerId[]; B: PlayerId[] } | null;
  summary: ScheduleSummary;
}
