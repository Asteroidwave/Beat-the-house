export type ConnectionRole = 'jockey' | 'trainer' | 'sire';

export interface Connection {
  id: string;
  name: string;
  role: ConnectionRole;
  salary: number;
  apps: number;
  avgOdds: number;
  avpa90d: number;
  trackAvpa: number;
  totalPoints: number;
  wins: number;
  places: number;
  shows: number;
  winPct: number;
  itmPct: number;
}

export interface HorseEntry {
  date: string;
  race: number;
  horse: string;
  pp: number;
  jockey: string;
  trainer: string;
  sire1: string;
  sire2?: string;
  mlOdds: string;
  mlOddsDecimal: number;
  salary: number;
  finish: number;
  totalPoints: number;
  avpa: number;
  raceAvpa: number;
  trackAvpa: number;
  isScratched: boolean;
}

export interface RaceInfo {
  date: string;
  raceNumber: number;
  entries: HorseEntry[];
}

export interface Pick {
  connection: Connection;
  addedAt: number;
}

export interface LineupStats {
  totalSalary: number;
  totalApps: number;
  avgOdds: number;
  expectedPoints: number;
}

export interface MultiplierTier {
  multiplier: number;
  threshold: number;
  label: string;
  color: string;
}

export interface GameResult {
  picks: Pick[];
  expectedPoints: number;
  actualPoints: number;
  targetPoints: number;
  selectedMultiplier: MultiplierTier;
  stake: number;
  payout: number;
  isWin: boolean;
}

export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  picks: Pick[];
  expectedPoints: number;
  actualPoints: number;
  targetPoints: number;
  multiplier: MultiplierTier;
  stake: number;
  payout: number;
  isWin: boolean;
  balanceAfter: number;
}
