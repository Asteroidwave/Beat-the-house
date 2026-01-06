import { OddsBucket, OddsBucketStats, HorseEntry } from '@/types';

// Odds buckets based on the provided table
export const ODDS_BUCKETS: OddsBucket[] = [
  { label: '1/5 to 3/5', minOdds: 0.20, maxOdds: 0.60, salary: 2600, decimalOdds: '0.20 - 0.60', probabilityRange: '83.33% - 55.87%' },
  { label: '4/5', minOdds: 0.61, maxOdds: 0.80, salary: 2500, decimalOdds: '0.8', probabilityRange: '55.56% - 50.25%' },
  { label: 'EVEN (1/1)', minOdds: 0.81, maxOdds: 1.00, salary: 2400, decimalOdds: '1', probabilityRange: '50.00% - 45.66%' },
  { label: '6/5', minOdds: 1.01, maxOdds: 1.20, salary: 2300, decimalOdds: '1.2', probabilityRange: '45.45% - 41.84%' },
  { label: '7/5', minOdds: 1.21, maxOdds: 1.40, salary: 2200, decimalOdds: '1.4', probabilityRange: '41.67% - 38.61%' },
  { label: '8/5', minOdds: 1.41, maxOdds: 1.60, salary: 2100, decimalOdds: '1.6', probabilityRange: '38.46% - 35.84%' },
  { label: '9/5', minOdds: 1.61, maxOdds: 1.80, salary: 2000, decimalOdds: '1.8', probabilityRange: '35.71% - 33.44%' },
  { label: '2/1', minOdds: 1.81, maxOdds: 2.00, salary: 1900, decimalOdds: '2', probabilityRange: '33.33% - 28.65%' },
  { label: '5/2', minOdds: 2.01, maxOdds: 2.50, salary: 1700, decimalOdds: '2.5', probabilityRange: '28.57% - 25.06%' },
  { label: '3/1', minOdds: 2.51, maxOdds: 3.00, salary: 1600, decimalOdds: '3', probabilityRange: '25.00% - 22.27%' },
  { label: '7/2', minOdds: 3.01, maxOdds: 3.50, salary: 1500, decimalOdds: '3.5', probabilityRange: '22.22% - 20.04%' },
  { label: '4/1', minOdds: 3.51, maxOdds: 4.00, salary: 1400, decimalOdds: '4', probabilityRange: '20.00% - 18.21%' },
  { label: '9/2 to 5/1', minOdds: 4.01, maxOdds: 5.00, salary: 1300, decimalOdds: '4.50 - 5.00', probabilityRange: '18.18% - 14.31%' },
  { label: '6/1 to 7/1', minOdds: 5.01, maxOdds: 7.00, salary: 1200, decimalOdds: '6.00 - 7.00', probabilityRange: '14.29% - 11.12%' },
  { label: '8/1 to 9/1', minOdds: 7.01, maxOdds: 9.00, salary: 1000, decimalOdds: '8.00 - 9.00', probabilityRange: '11.11% - 9.10%' },
  { label: '10/1 to 11/1', minOdds: 9.01, maxOdds: 11.00, salary: 900, decimalOdds: '10.00 - 11.00', probabilityRange: '9.09% - 7.70%' },
  { label: '12/1 to 14/1', minOdds: 11.01, maxOdds: 14.00, salary: 800, decimalOdds: '12.00 - 14.00', probabilityRange: '7.69% - 6.25%' },
  { label: '15/1 to 19/1', minOdds: 14.01, maxOdds: 19.00, salary: 700, decimalOdds: '15.00 - 19.00', probabilityRange: '6.25% - 4.76%' },
  { label: '20/1 to 29/1', minOdds: 19.01, maxOdds: 29.00, salary: 600, decimalOdds: '20.00 - 29.00', probabilityRange: '4.76% - 3.23%' },
  { label: '30/1 to 49/1', minOdds: 29.01, maxOdds: 49.00, salary: 400, decimalOdds: '30.00 - 49.00', probabilityRange: '3.23% - 1.96%' },
  { label: '50/1+', minOdds: 49.01, maxOdds: 999.00, salary: 200, decimalOdds: '>= 50.00', probabilityRange: '1.96% - 0.00%' },
];

// Also Entered (AE) buckets for sires
export const AE_BUCKETS: OddsBucket[] = [
  { label: 'AE 0 to 5.99', minOdds: 0, maxOdds: 5.99, salary: 300, decimalOdds: '0.00 - 5.99', probabilityRange: '100.00% - 14.31%' },
  { label: 'AE 6 to 12.99', minOdds: 6.00, maxOdds: 12.99, salary: 200, decimalOdds: '6.00 - 12.99', probabilityRange: '14.29% - 7.15%' },
  { label: 'AE 13+', minOdds: 13.00, maxOdds: 999.00, salary: 100, decimalOdds: '>= 13.00', probabilityRange: '7.14% - 0.00%' },
];

// Global prior for Bayesian shrinkage - will be computed from all data
interface GlobalPrior {
  mu: number;
  variance: number;
  n: number;
}

let globalPrior: GlobalPrior | null = null;

/**
 * Find which odds bucket a horse belongs to based on decimal odds
 */
export function findOddsBucket(decimalOdds: number): OddsBucket {
  const bucket = ODDS_BUCKETS.find(b => decimalOdds >= b.minOdds && decimalOdds <= b.maxOdds);
  return bucket || ODDS_BUCKETS[ODDS_BUCKETS.length - 1]; // Default to last bucket
}

/**
 * Calculate sample variance (VAR.S)
 */
function calculateSampleVariance(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const sumSquaredDiffs = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  return sumSquaredDiffs / (values.length - 1);
}

/**
 * Apply 3-bucket weighted moving average for smoothing
 * Weights: [0.25, 0.5, 0.25] for [prev, current, next]
 */
function smooth3BucketWMA(values: number[]): number[] {
  const smoothed: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const prev = i > 0 ? values[i - 1] : values[i];
    const curr = values[i];
    const next = i < values.length - 1 ? values[i + 1] : values[i];
    smoothed.push(0.25 * prev + 0.5 * curr + 0.25 * next);
  }
  return smoothed;
}

/**
 * Apply Bayesian shrinkage to estimates with small sample sizes
 * Shrinks toward global mean when sample size is small
 * 
 * Formula: shrunk_mu = (n * sample_mu + k * prior_mu) / (n + k)
 * where k is the shrinkage strength (higher = more shrinkage to prior)
 */
function applyBayesianShrinkage(
  sampleMu: number,
  sampleVariance: number,
  sampleN: number,
  prior: GlobalPrior,
  shrinkageStrength: number = 10
): { mu: number; variance: number } {
  if (sampleN === 0) {
    return { mu: prior.mu, variance: prior.variance };
  }
  
  // Shrink mean toward global mean
  const shrunkMu = (sampleN * sampleMu + shrinkageStrength * prior.mu) / (sampleN + shrinkageStrength);
  
  // For variance, use similar shrinkage with a floor to prevent 0 variance
  const minVariance = prior.variance * 0.1; // At least 10% of prior variance
  const shrunkVariance = Math.max(
    (sampleN * sampleVariance + shrinkageStrength * prior.variance) / (sampleN + shrinkageStrength),
    minVariance
  );
  
  return { mu: shrunkMu, variance: shrunkVariance };
}

/**
 * Build odds bucket statistics from horse data with Bayesian shrinkage
 */
export function buildOddsBucketStats(horses: Omit<HorseEntry, 'mu' | 'variance' | 'sigma' | 'muSmooth' | 'varianceSmooth' | 'sigmaSmooth'>[]): Map<string, OddsBucketStats> {
  // Filter out scratched horses
  const validHorses = horses.filter(h => !h.isScratched && h.finish > 0);
  
  // Calculate global prior from all valid horses (for Bayesian shrinkage)
  const allPoints = validHorses.map(h => h.totalPoints || 0);
  const globalMu = allPoints.length > 0 ? allPoints.reduce((a, b) => a + b, 0) / allPoints.length : 0;
  const globalVariance = calculateSampleVariance(allPoints, globalMu);
  globalPrior = { mu: globalMu, variance: globalVariance, n: allPoints.length };
  
  // Group horses by bucket
  const bucketHorses = new Map<string, typeof validHorses>();
  
  ODDS_BUCKETS.forEach(bucket => {
    bucketHorses.set(bucket.label, []);
  });
  
  validHorses.forEach(horse => {
    const bucket = findOddsBucket(horse.mlOddsDecimal);
    const existing = bucketHorses.get(bucket.label) || [];
    existing.push(horse);
    bucketHorses.set(bucket.label, existing);
  });
  
  // Calculate raw statistics for each bucket
  const rawStats: OddsBucketStats[] = ODDS_BUCKETS.map(bucket => {
    const bucketList = bucketHorses.get(bucket.label) || [];
    const count = bucketList.length;
    
    if (count === 0) {
      // Apply full prior for empty buckets
      const shrunk = applyBayesianShrinkage(0, 0, 0, globalPrior!);
      return {
        bucket,
        horsesCount: 0,
        wins: 0, winPct: 0,
        places: 0, placePct: 0,
        shows: 0, showPct: 0,
        dnf: 0, itmPct: 0,
        totalPoints: 0,
        totalPointsWithScrAdj: 0,
        avgPoints: shrunk.mu,
        avgPointsWithScrAdj: shrunk.mu,
        totalSalary: 0,
        totalSalaryWithScrAdj: 0,
        pointsPer1000: 0,
        mu: shrunk.mu,
        variance: shrunk.variance,
        sigma: Math.sqrt(shrunk.variance),
        muSmooth: shrunk.mu,
        varianceSmooth: shrunk.variance,
        sigmaSmooth: Math.sqrt(shrunk.variance),
      };
    }
    
    const wins = bucketList.filter(h => h.finish === 1).length;
    const places = bucketList.filter(h => h.finish === 2).length;
    const shows = bucketList.filter(h => h.finish === 3).length;
    const dnf = bucketList.filter(h => h.finish > 3 || h.finish === 0).length;
    const itm = wins + places + shows;
    
    const totalPoints = bucketList.reduce((sum, h) => sum + (h.totalPoints || 0), 0);
    const totalSalary = bucketList.reduce((sum, h) => sum + (h.salary || 0), 0);
    
    const pointsArray = bucketList.map(h => h.totalPoints || 0);
    const rawMu = count > 0 ? totalPoints / count : 0;
    const rawVariance = calculateSampleVariance(pointsArray, rawMu);
    
    // Apply Bayesian shrinkage for small samples
    const shrunk = applyBayesianShrinkage(rawMu, rawVariance, count, globalPrior!);
    
    return {
      bucket,
      horsesCount: count,
      wins,
      winPct: count > 0 ? (wins / count) * 100 : 0,
      places,
      placePct: count > 0 ? (places / count) * 100 : 0,
      shows,
      showPct: count > 0 ? (shows / count) * 100 : 0,
      dnf,
      itmPct: count > 0 ? (itm / count) * 100 : 0,
      totalPoints,
      totalPointsWithScrAdj: totalPoints,
      avgPoints: rawMu,
      avgPointsWithScrAdj: rawMu,
      totalSalary,
      totalSalaryWithScrAdj: totalSalary,
      pointsPer1000: totalSalary > 0 ? (totalPoints / totalSalary) * 1000 : 0,
      mu: shrunk.mu,
      variance: shrunk.variance,
      sigma: Math.sqrt(shrunk.variance),
      muSmooth: shrunk.mu, // Will be updated after smoothing
      varianceSmooth: shrunk.variance,
      sigmaSmooth: Math.sqrt(shrunk.variance),
    };
  });
  
  // Apply smoothing
  const muValues = rawStats.map(s => s.mu);
  const varValues = rawStats.map(s => s.variance);
  
  const muSmoothed = smooth3BucketWMA(muValues);
  const varSmoothed = smooth3BucketWMA(varValues);
  
  // Update with smoothed values
  rawStats.forEach((stat, i) => {
    stat.muSmooth = muSmoothed[i];
    stat.varianceSmooth = varSmoothed[i];
    stat.sigmaSmooth = Math.sqrt(varSmoothed[i]);
  });
  
  // Create map
  const statsMap = new Map<string, OddsBucketStats>();
  rawStats.forEach(stat => {
    statsMap.set(stat.bucket.label, stat);
  });
  
  return statsMap;
}

/**
 * Get μ and σ for a horse based on its odds bucket
 */
export function getHorseStats(
  horse: Omit<HorseEntry, 'mu' | 'variance' | 'sigma' | 'muSmooth' | 'varianceSmooth' | 'sigmaSmooth'>,
  bucketStats: Map<string, OddsBucketStats>
): { mu: number; variance: number; sigma: number; muSmooth: number; varianceSmooth: number; sigmaSmooth: number } {
  const bucket = findOddsBucket(horse.mlOddsDecimal);
  const stats = bucketStats.get(bucket.label);
  
  if (!stats) {
    // Fall back to global prior
    if (globalPrior) {
      return {
        mu: globalPrior.mu,
        variance: globalPrior.variance,
        sigma: Math.sqrt(globalPrior.variance),
        muSmooth: globalPrior.mu,
        varianceSmooth: globalPrior.variance,
        sigmaSmooth: Math.sqrt(globalPrior.variance),
      };
    }
    return { mu: 0, variance: 0, sigma: 0, muSmooth: 0, varianceSmooth: 0, sigmaSmooth: 0 };
  }
  
  return {
    mu: stats.mu,
    variance: stats.variance,
    sigma: stats.sigma,
    muSmooth: stats.muSmooth,
    varianceSmooth: stats.varianceSmooth,
    sigmaSmooth: stats.sigmaSmooth,
  };
}

/**
 * Z-values for each multiplier tier
 * These determine how hard each target is to hit
 */
export const Z_VALUES = {
  '0.5x': -1.00,   // Easy target (below mean)
  '2x': 0.03,      // Just above mean
  '3x': 0.53,      // Half sigma above mean
  '5x': 1.18,      // Just over 1 sigma above mean
};

/**
 * Calculate target points for a given μ and σ
 */
export function calculateTargets(
  mu: number,
  sigma: number,
  stake: number
): { multiplier: number; label: string; zValue: number; targetPoints: number; payout: number; color: string }[] {
  return [
    {
      multiplier: 0.5,
      label: '0.5x',
      color: '#94a3b8',
      zValue: Z_VALUES['0.5x'],
      targetPoints: mu + Z_VALUES['0.5x'] * sigma,
      payout: stake * 0.5,
    },
    {
      multiplier: 2,
      label: '2x',
      color: '#22c55e',
      zValue: Z_VALUES['2x'],
      targetPoints: mu + Z_VALUES['2x'] * sigma,
      payout: stake * 2,
    },
    {
      multiplier: 3,
      label: '3x',
      color: '#3b82f6',
      zValue: Z_VALUES['3x'],
      targetPoints: mu + Z_VALUES['3x'] * sigma,
      payout: stake * 3,
    },
    {
      multiplier: 5,
      label: '5x',
      color: '#a855f7',
      zValue: Z_VALUES['5x'],
      targetPoints: mu + Z_VALUES['5x'] * sigma,
      payout: stake * 5,
    },
  ];
}

/**
 * Determine which tier was achieved based on actual points
 */
export function determineAchievedTier(
  actualPoints: number,
  targets: { multiplier: number; label: string; targetPoints: number; payout: number; color: string; zValue: number }[]
): { multiplier: number; label: string; targetPoints: number; payout: number; color: string; zValue: number } | null {
  // Check from highest to lowest
  const sortedTargets = [...targets].sort((a, b) => b.multiplier - a.multiplier);
  
  for (const target of sortedTargets) {
    if (actualPoints >= target.targetPoints) {
      return target;
    }
  }
  
  return null; // Didn't hit any target
}
