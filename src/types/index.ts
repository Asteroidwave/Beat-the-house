export type ConnectionRole = 'jockey' | 'trainer' | 'sire';

// Odds bucket statistics
export interface OddsBucket {
  label: string;
  minOdds: number;
  maxOdds: number;
  salary: number;
  decimalOdds: string;
  probabilityRange: string;
}

export interface OddsBucketStats {
  bucket: OddsBucket;
  horsesCount: number;
  wins: number;
  winPct: number;
  places: number;
  placePct: number;
  shows: number;
  showPct: number;
  dnf: number;
  itmPct: number;
  totalPoints: number;
  totalPointsWithScrAdj: number;
  avgPoints: number;
  avgPointsWithScrAdj: number;
  totalSalary: number;
  totalSalaryWithScrAdj: number;
  pointsPer1000: number;
  // Raw statistics
  mu: number;           // Mean of points
  variance: number;     // Sample variance
  sigma: number;        // Standard deviation
  // Smoothed statistics (3-bucket weighted moving average)
  muSmooth: number;
  varianceSmooth: number;
  sigmaSmooth: number;
}

// Horse with statistical properties
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
  newMlOdds?: string;
  newMlOddsDecimal?: number;
  salary: number;
  finish: number;
  totalPoints: number;
  avpa: number;
  raceAvpa: number;
  trackAvpa: number;
  isScratched: boolean;
  // Statistical properties based on odds bucket
  mu: number;
  variance: number;
  sigma: number;
  muSmooth: number;
  varianceSmooth: number;
  sigmaSmooth: number;
}

// Connection with aggregated statistics
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
  // Aggregated statistics from horses
  mu: number;
  variance: number;
  sigma: number;
  muSmooth: number;
  varianceSmooth: number;
  sigmaSmooth: number;
  // Horse IDs this connection is associated with (for stacking detection)
  horseIds: string[];
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

// Lineup statistics with μ and σ
export interface LineupStats {
  totalSalary: number;
  totalApps: number;
  avgOdds: number;
  expectedPoints: number;
  // Statistical aggregates
  mu: number;
  variance: number;
  sigma: number;
  muSmooth: number;
  varianceSmooth: number;
  sigmaSmooth: number;
  // Stacking info
  uniqueHorses: number;
  stackedHorses: number;
  stackingAdjustment: number;
}

// Dynamic target thresholds
export interface TargetThreshold {
  multiplier: number;
  label: string;
  color: string;
  zValue: number;        // z-score for this tier
  targetPoints: number;  // Calculated: μ + z*σ
  payout: number;        // stake * multiplier
}

export interface MultiplierTier {
  multiplier: number;
  threshold: number;
  label: string;
  color: string;
  zValue: number;  // z-score for calculating target
}

export interface GameResult {
  picks: Pick[];
  lineupStats: LineupStats;
  actualPoints: number;
  targets: TargetThreshold[];
  achievedTier: TargetThreshold | null;
  stake: number;
  payout: number;
  isWin: boolean;
}

export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  picks: Pick[];
  lineupStats: LineupStats;
  actualPoints: number;
  targets: TargetThreshold[];
  achievedTier: TargetThreshold | null;
  stake: number;
  payout: number;
  isWin: boolean;
  balanceAfter: number;
}
