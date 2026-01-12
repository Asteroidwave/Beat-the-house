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

// ============================================================================
// DYNAMIC Z-VALUE CALCULATION (Power-Law Formula)
// ============================================================================
// This implements ChatGPT's correct formula for computing z-values that
// guarantee a specific expected return (e.g., 80% to players, 20% house edge)
//
// The formula:
//   1. c = (1 - houseTake) / Σ[(mᵢ - mᵢ₋₁) / mᵢ^α]
//   2. qᵢ = c / mᵢ^α  (tail probability for tier i)
//   3. zᵢ = Φ⁻¹(1 - qᵢ) (inverse normal CDF)
//   4. Threshold_i = μ + zᵢ · σ
//
// This ensures the expected payout is exactly (1 - houseTake).
// ============================================================================

/**
 * Inverse normal CDF (standard normal quantile function)
 * Approximation using Abramowitz and Stegun formula 26.2.23
 */
function normsinv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a1 = -39.6968302866538;
  const a2 = 220.946098424521;
  const a3 = -275.928510446969;
  const a4 = 138.357751867269;
  const a5 = -30.6647980661472;
  const a6 = 2.50662823884;
  const b1 = -54.4760987982241;
  const b2 = 161.585836858041;
  const b3 = -155.698979859887;
  const b4 = 66.8013118877197;
  const b5 = -13.2806815528857;
  const c1 = -7.78489400243029e-3;
  const c2 = -0.322396458041136;
  const c3 = -2.40075827716184;
  const c4 = -2.54973253934373;
  const c5 = 4.37466414146497;
  const c6 = 2.93816398269878;
  const d1 = 7.78469570904146e-3;
  const d2 = 0.32246712907004;
  const d3 = 2.445134137143;
  const d4 = 3.75440866190742;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
           ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
           (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

/**
 * Configuration for z-value calculation
 */
export interface ZValueConfig {
  houseTake: number;  // e.g., 0.20 for 20% house edge
  alpha: number;      // Power-law shape parameter (1.0 is a good default)
}

export const DEFAULT_Z_CONFIG: ZValueConfig = {
  houseTake: 0.20,  // 20% house edge = 80% return to players
  alpha: 1.0,       // Linear power-law (higher = harder high multipliers)
};

/**
 * Compute dynamic z-values for any set of multipliers using the power-law formula.
 * 
 * This ensures the expected payout equals (1 - houseTake) regardless of which
 * multipliers are active or their exact values.
 * 
 * @param multipliers - Array of multiplier values (e.g., [0.5, 2, 3, 5])
 * @param config - Configuration with houseTake and alpha
 * @returns Array of { multiplier, tailProb, zValue } for each tier
 */
export function computeDynamicZValues(
  multipliers: number[],
  config: ZValueConfig = DEFAULT_Z_CONFIG
): { multiplier: number; tailProb: number; zValue: number }[] {
  // Sort multipliers low to high
  const sorted = [...multipliers].sort((a, b) => a - b);
  
  if (sorted.length === 0) {
    return [];
  }
  
  const { houseTake, alpha } = config;
  
  // Compute deltas: m_i - m_{i-1} (with m_0 = 0)
  const deltas = sorted.map((m, i) => i === 0 ? m : m - sorted[i - 1]);
  
  // Compute denominator: Σ[(mᵢ - mᵢ₋₁) / mᵢ^α]
  const denominator = sorted.reduce((sum, m, i) => {
    return sum + deltas[i] / Math.pow(m, alpha);
  }, 0);
  
  // Compute scaling constant c
  const c = (1 - houseTake) / denominator;
  
  // Compute tail probabilities and z-values for each tier
  return sorted.map(m => {
    const tailProb = c / Math.pow(m, alpha);
    const zValue = normsinv(1 - tailProb);
    return {
      multiplier: m,
      tailProb,
      zValue,
    };
  });
}

/**
 * Get color for a multiplier value
 */
export function getMultiplierColor(mult: number): string {
  if (mult <= 0.5) return '#94a3b8'; // slate
  if (mult <= 1.5) return '#22c55e'; // green
  if (mult <= 3) return '#3b82f6';   // blue
  if (mult <= 5) return '#a855f7';   // purple
  if (mult <= 10) return '#f59e0b';  // amber
  return '#ef4444';                  // red
}

/**
 * Target information for a single tier
 */
export interface TargetTier {
  multiplier: number;
  label: string;
  color: string;
  zValue: number;
  tailProb: number;      // Probability of hitting this tier or higher
  targetPoints: number;  // μ + z·σ
  payout: number;        // stake * multiplier
}

/**
 * Calculate target points for given multipliers, μ, σ, and stake.
 * Uses dynamic z-value calculation to ensure correct expected return.
 * 
 * @param mu - Lineup expected value (μ)
 * @param sigma - Lineup standard deviation (σ)
 * @param stake - Player's stake amount
 * @param multipliers - Active multiplier values
 * @param config - Z-value configuration (house take, alpha)
 * @returns Array of TargetTier objects sorted by multiplier (low to high)
 */
export function calculateTargets(
  mu: number,
  sigma: number,
  stake: number,
  multipliers: number[] = [0.5, 2, 3, 5],
  config: ZValueConfig = DEFAULT_Z_CONFIG
): TargetTier[] {
  const zValues = computeDynamicZValues(multipliers, config);
  
  return zValues.map(({ multiplier, tailProb, zValue }) => ({
    multiplier,
    label: `${multiplier}x`,
    color: getMultiplierColor(multiplier),
    zValue,
    tailProb,
    targetPoints: mu + zValue * sigma,
    payout: stake * multiplier,
  }));
}

/**
 * Determine which tier was achieved based on actual points
 * Accepts either TargetTier or TargetThreshold (from types)
 */
export function determineAchievedTier<T extends { multiplier: number; targetPoints: number }>(
  actualPoints: number,
  targets: T[]
): T | null {
  // Check from highest to lowest multiplier
  const sortedTargets = [...targets].sort((a, b) => b.multiplier - a.multiplier);
  
  for (const target of sortedTargets) {
    if (actualPoints >= target.targetPoints) {
      return target;
    }
  }
  
  return null; // Didn't hit any target
}

/**
 * Calculate expected return for a given set of targets
 * This can be used to verify the math is correct
 * 
 * @param targets - Array of TargetTier objects
 * @returns Expected return as a fraction (e.g., 0.80 for 80%)
 */
export function calculateExpectedReturn(targets: TargetTier[]): number {
  const sorted = [...targets].sort((a, b) => a.multiplier - b.multiplier);
  
  // Calculate marginal probabilities (prob of hitting exactly this tier)
  const marginalProbs = sorted.map((t, i) => {
    if (i === sorted.length - 1) {
      return t.tailProb; // Highest tier: P(exact) = P(≥ this tier)
    }
    return t.tailProb - sorted[i + 1].tailProb;
  });
  
  // Expected payout = Σ(multiplier × marginal probability)
  return sorted.reduce((sum, t, i) => sum + t.multiplier * marginalProbs[i], 0);
}

/**
 * Debug function to print z-value calculation details
 */
export function debugZValues(
  multipliers: number[],
  config: ZValueConfig = DEFAULT_Z_CONFIG
): void {
  const targets = calculateTargets(0, 1, 1, multipliers, config); // μ=0, σ=1, stake=1 for simplicity
  const expectedReturn = calculateExpectedReturn(targets);
  
  console.log('=== Z-Value Calculation Debug ===');
  console.log('Multipliers:', multipliers);
  console.log('House Take:', config.houseTake);
  console.log('Alpha:', config.alpha);
  console.log('');
  console.log('Tier Details:');
  targets.forEach(t => {
    console.log(`  ${t.label}: z=${t.zValue.toFixed(3)}, P(hit)=${(t.tailProb * 100).toFixed(2)}%`);
  });
  console.log('');
  console.log(`Expected Return: ${(expectedReturn * 100).toFixed(2)}%`);
  console.log(`House Edge: ${((1 - expectedReturn) * 100).toFixed(2)}%`);
}
