import { Connection, HorseEntry, RaceInfo, OddsBucketStats, AvailableDate } from '@/types';
import { buildOddsBucketStats, getHorseStats } from './oddsStatistics';

// Minimum scratches threshold - dates with more than this many scratches are excluded
const MAX_SCRATCHES_PER_DAY = 10;

// Cache version - increment to invalidate cache when data format changes
const CACHE_VERSION = 1;
const CACHE_PREFIX = 'bth_cache_v' + CACHE_VERSION;

// Track metadata interface
interface TrackMetadata {
  code: string;
  name: string;
  dates: string[];
  horseCount: number;
  raceCount: number;
}

// Raw data interfaces
interface RawHorse {
  date: string;
  race: number;
  horse: string;
  pp: number;
  jockey: string;
  trainer: string;
  sire1: string;
  sire2: string | null;
  mlOdds: string;
  mlOddsDecimal: number;
  newMlOdds: string | null;
  newMlOddsDecimal: number | null;
  salary: number;
  finish: number;
  totalPoints: number;
  avpa: number;
  raceAvpa: number;
  trackAvpa: number;
  isScratched: boolean;
}

interface RawConnection {
  date: string;
  name: string;
  salary: number;
  apps: number;
  avgOdds: number;
  totalPoints: number;
  trackAvpa: number;
  wins: number;
  places: number;
  shows: number;
  winPct: number;
  itmPct: number;
}

interface RawStats {
  name: string;
  avpa90d: number;
}

interface RawTrackData {
  trackCode: string;
  horses: RawHorse[];
  jockeys: RawConnection[];
  trainers: RawConnection[];
  sires: RawConnection[];
  jockeyStats: RawStats[];
  trainerStats: RawStats[];
  sireStats: RawStats[];
  dates: string[];
}

interface TrackData {
  trackCode: string;
  horses: HorseEntry[];
  jockeys: Map<string, Connection>;
  trainers: Map<string, Connection>;
  sires: Map<string, Connection>;
  stats: {
    jockeys: Map<string, { avpa90d: number }>;
    trainers: Map<string, { avpa90d: number }>;
    sires: Map<string, { avpa90d: number }>;
  };
  oddsBucketStats: Map<string, OddsBucketStats>;
  dates: string[];
}

// In-memory cache for loaded track data
const trackCache = new Map<string, TrackData>();

// Cached track metadata (quick to load)
let trackMetadataCache: TrackMetadata[] | null = null;

/**
 * Try to get data from sessionStorage cache
 */
function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}_${key}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Cache read failed, continue without cache
  }
  return null;
}

/**
 * Save data to sessionStorage cache
 */
function saveToCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}_${key}`, JSON.stringify(data));
  } catch {
    // Cache write failed (quota exceeded, etc), continue without caching
  }
}

/**
 * Load track metadata (fast - just track list with dates)
 */
export async function loadTrackMetadata(): Promise<TrackMetadata[]> {
  if (trackMetadataCache) {
    return trackMetadataCache;
  }
  
  // Try session cache
  const cached = getFromCache<TrackMetadata[]>('tracks_metadata');
  if (cached) {
    trackMetadataCache = cached;
    return cached;
  }
  
  const response = await fetch('/data/tracks.json');
  if (!response.ok) {
    throw new Error('Failed to load track metadata');
  }
  
  const metadata: TrackMetadata[] = await response.json();
  trackMetadataCache = metadata;
  saveToCache('tracks_metadata', metadata);
  
  return metadata;
}

/**
 * Load data for a specific track from JSON
 */
export async function loadTrackData(trackCode: string): Promise<TrackData> {
  // Check in-memory cache first
  if (trackCache.has(trackCode)) {
    return trackCache.get(trackCode)!;
  }
  
  const response = await fetch(`/data/${trackCode}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load data for ${trackCode}`);
  }
  
  const rawData: RawTrackData = await response.json();
  
  // Process horses without stats first
  const horsesWithoutStats = rawData.horses.map((h) => ({
    ...h,
    sire2: h.sire2 || undefined,
    newMlOdds: h.newMlOdds || undefined,
    newMlOddsDecimal: h.newMlOddsDecimal || undefined,
  }));
  
  // Build odds bucket statistics
  const oddsBucketStats = buildOddsBucketStats(horsesWithoutStats);
  
  // Add μ/σ to each horse
  const horses: HorseEntry[] = horsesWithoutStats.map((horse) => {
    const stats = getHorseStats(horse, oddsBucketStats);
    return {
      ...horse,
      mu: stats.mu,
      variance: stats.variance,
      sigma: stats.sigma,
      muSmooth: stats.muSmooth,
      varianceSmooth: stats.varianceSmooth,
      sigmaSmooth: stats.sigmaSmooth,
    };
  });
  
  // Build connection maps
  const jockeys = new Map<string, Connection>();
  rawData.jockeys.forEach((row) => {
    const key = `${row.date}-${row.name}`;
    jockeys.set(key, {
      id: `jockey-${row.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: row.name,
      role: 'jockey',
      salary: row.salary,
      apps: row.apps,
      avgOdds: row.avgOdds,
      avpa90d: 0,
      trackAvpa: row.trackAvpa,
      totalPoints: row.totalPoints,
      wins: row.wins,
      places: row.places,
      shows: row.shows,
      winPct: row.winPct,
      itmPct: row.itmPct,
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      horseIds: [],
    });
  });
  
  const trainers = new Map<string, Connection>();
  rawData.trainers.forEach((row) => {
    const key = `${row.date}-${row.name}`;
    trainers.set(key, {
      id: `trainer-${row.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: row.name,
      role: 'trainer',
      salary: row.salary,
      apps: row.apps,
      avgOdds: row.avgOdds,
      avpa90d: 0,
      trackAvpa: row.trackAvpa,
      totalPoints: row.totalPoints,
      wins: row.wins,
      places: row.places,
      shows: row.shows,
      winPct: row.winPct,
      itmPct: row.itmPct,
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      horseIds: [],
    });
  });
  
  const sires = new Map<string, Connection>();
  rawData.sires.forEach((row) => {
    const key = `${row.date}-${row.name}`;
    sires.set(key, {
      id: `sire-${row.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: row.name,
      role: 'sire',
      salary: row.salary,
      apps: row.apps,
      avgOdds: row.avgOdds,
      avpa90d: 0,
      trackAvpa: row.trackAvpa,
      totalPoints: row.totalPoints,
      wins: row.wins,
      places: row.places,
      shows: row.shows,
      winPct: row.winPct,
      itmPct: row.itmPct,
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      horseIds: [],
    });
  });
  
  // Build stats maps
  const jockeyStats = new Map<string, { avpa90d: number }>();
  rawData.jockeyStats.forEach((row) => {
    jockeyStats.set(row.name, { avpa90d: row.avpa90d });
  });
  
  const trainerStats = new Map<string, { avpa90d: number }>();
  rawData.trainerStats.forEach((row) => {
    trainerStats.set(row.name, { avpa90d: row.avpa90d });
  });
  
  const sireStats = new Map<string, { avpa90d: number }>();
  rawData.sireStats.forEach((row) => {
    sireStats.set(row.name, { avpa90d: row.avpa90d });
  });
  
  const trackData: TrackData = {
    trackCode,
    horses,
    jockeys,
    trainers,
    sires,
    stats: {
      jockeys: jockeyStats,
      trainers: trainerStats,
      sires: sireStats,
    },
    oddsBucketStats,
    dates: rawData.dates,
  };
  
  // Cache the data
  trackCache.set(trackCode, trackData);
  
  return trackData;
}

/**
 * Get data for a specific date and track
 */
export async function getDataForDate(date: string, trackCode: string = 'AQU') {
  const data = await loadTrackData(trackCode);

  // Filter horses for this date
  const dayHorses = data.horses.filter((h) => h.date === date);
  const validDayHorses = dayHorses.filter((h) => !h.isScratched);

  // Group by race
  const raceMap = new Map<number, HorseEntry[]>();
  dayHorses.forEach((h) => {
    if (!raceMap.has(h.race)) {
      raceMap.set(h.race, []);
    }
    raceMap.get(h.race)!.push(h);
  });

  const races: RaceInfo[] = Array.from(raceMap.entries())
    .map(([raceNumber, entries]) => ({
      date,
      raceNumber,
      entries: entries.sort((a, b) => a.pp - b.pp),
    }))
    .sort((a, b) => a.raceNumber - b.raceNumber);

  // Get connections for this date with aggregated μ/σ from horses
  const connections: Connection[] = [];
  const seenConnections = new Set<string>();

  // Helper to calculate connection stats from horses
  const calculateConnectionStats = (
    connectionName: string,
    role: 'jockey' | 'trainer' | 'sire'
  ) => {
    const connHorses = validDayHorses.filter((h) => {
      if (role === 'jockey') return h.jockey === connectionName;
      if (role === 'trainer') return h.trainer === connectionName;
      if (role === 'sire') return h.sire1 === connectionName || h.sire2 === connectionName;
      return false;
    });

    const mu = connHorses.reduce((sum, h) => sum + h.mu, 0);
    const variance = connHorses.reduce((sum, h) => sum + h.variance, 0);
    const sigma = Math.sqrt(variance);

    const muSmooth = connHorses.reduce((sum, h) => sum + h.muSmooth, 0);
    const varianceSmooth = connHorses.reduce((sum, h) => sum + h.varianceSmooth, 0);
    const sigmaSmooth = Math.sqrt(varianceSmooth);

    const horseIds = connHorses.map((h) => `${h.date}-${h.race}-${h.horse}`);

    return { mu, variance, sigma, muSmooth, varianceSmooth, sigmaSmooth, horseIds };
  };

  // Add jockeys
  data.jockeys.forEach((conn, key) => {
    if (key.startsWith(date)) {
      const stats90d = data.stats.jockeys.get(conn.name);
      const connectionStats = calculateConnectionStats(conn.name, 'jockey');
      
      if (!seenConnections.has(conn.id)) {
        connections.push({
          ...conn,
          avpa90d: stats90d?.avpa90d || conn.trackAvpa || 0,
          ...connectionStats,
        });
        seenConnections.add(conn.id);
      }
    }
  });

  // Add trainers
  data.trainers.forEach((conn, key) => {
    if (key.startsWith(date)) {
      const stats90d = data.stats.trainers.get(conn.name);
      const connectionStats = calculateConnectionStats(conn.name, 'trainer');
      
      if (!seenConnections.has(conn.id)) {
        connections.push({
          ...conn,
          avpa90d: stats90d?.avpa90d || conn.trackAvpa || 0,
          ...connectionStats,
        });
        seenConnections.add(conn.id);
      }
    }
  });

  // Add sires
  data.sires.forEach((conn, key) => {
    if (key.startsWith(date)) {
      const stats90d = data.stats.sires.get(conn.name);
      const connectionStats = calculateConnectionStats(conn.name, 'sire');
      
      if (!seenConnections.has(conn.id)) {
        connections.push({
          ...conn,
          avpa90d: stats90d?.avpa90d || conn.trackAvpa || 0,
          ...connectionStats,
        });
        seenConnections.add(conn.id);
      }
    }
  });

  return { races, connections, horses: dayHorses, oddsBucketStats: data.oddsBucketStats };
}

/**
 * Get all available tracks with their race dates (fast - uses metadata)
 */
export async function getAvailableTracks(): Promise<{ code: string; name: string; dates: string[] }[]> {
  const metadata = await loadTrackMetadata();
  
  // Filter to only valid dates (with races and not too many scratches)
  // For metadata, we assume all dates in the JSON are already valid
  return metadata.map(m => ({
    code: m.code,
    name: m.name,
    dates: m.dates,
  }));
}

/**
 * Get available dates for a specific track
 */
export async function getAvailableDates(trackCode: string = 'AQU'): Promise<AvailableDate[]> {
  const data = await loadTrackData(trackCode);
  
  // Group horses by date
  const dateMap = new Map<string, { total: number; scratches: number; races: Set<number> }>();
  
  data.horses.forEach((horse) => {
    const existing = dateMap.get(horse.date) || { total: 0, scratches: 0, races: new Set() };
    existing.total++;
    existing.races.add(horse.race);
    if (horse.isScratched) {
      existing.scratches++;
    }
    dateMap.set(horse.date, existing);
  });
  
  // Filter and format dates
  const availableDates: AvailableDate[] = [];
  
  dateMap.forEach((stats, date) => {
    const validHorses = stats.total - stats.scratches;
    if (validHorses > 0 && stats.scratches <= MAX_SCRATCHES_PER_DAY) {
      availableDates.push({
        date,
        raceCount: stats.races.size,
        horseCount: stats.total,
        scratchCount: stats.scratches,
      });
    }
  });
  
  // Sort by date (newest first)
  return availableDates.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Get historical performance for a connection across all available data
 */
export async function getConnectionHistory(
  connectionName: string,
  role: 'jockey' | 'trainer' | 'sire',
  trackCode: string = 'AQU'
): Promise<{
  date: string;
  raceNumber: number;
  horseName: string;
  finish: number;
  odds: string;
  expectedPoints: number;
  actualPoints: number;
}[]> {
  const data = await loadTrackData(trackCode);
  
  const history: {
    date: string;
    raceNumber: number;
    horseName: string;
    finish: number;
    odds: string;
    expectedPoints: number;
    actualPoints: number;
  }[] = [];
  
  data.horses.forEach((horse) => {
    if (horse.isScratched) return;
    
    let isMatch = false;
    if (role === 'jockey' && horse.jockey === connectionName) isMatch = true;
    if (role === 'trainer' && horse.trainer === connectionName) isMatch = true;
    if (role === 'sire' && (horse.sire1 === connectionName || horse.sire2 === connectionName)) isMatch = true;
    
    if (isMatch) {
      history.push({
        date: horse.date,
        raceNumber: horse.race,
        horseName: horse.horse,
        finish: horse.finish,
        odds: horse.mlOdds,
        expectedPoints: horse.muSmooth || 0,
        actualPoints: horse.totalPoints || 0,
      });
    }
  });
  
  // Sort by date (newest first), then by race number
  return history.sort((a, b) => {
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.raceNumber - b.raceNumber;
  });
}

export function calculateExpectedPoints(picks: Connection[]): number {
  return picks.reduce((sum, conn) => {
    return sum + conn.avpa90d * conn.apps;
  }, 0);
}

export function calculateActualPoints(
  picks: Connection[],
  horses: HorseEntry[]
): Map<string, number> {
  const results = new Map<string, number>();

  picks.forEach((conn) => {
    let points = 0;

    horses.forEach((horse) => {
      if (horse.isScratched) return;
      
      if (conn.role === 'jockey' && horse.jockey === conn.name) {
        points += horse.totalPoints;
      } else if (conn.role === 'trainer' && horse.trainer === conn.name) {
        points += horse.totalPoints;
      } else if (conn.role === 'sire' && (horse.sire1 === conn.name || horse.sire2 === conn.name)) {
        points += horse.totalPoints;
      }
    });

    results.set(conn.id, points);
  });

  return results;
}

/**
 * Calculate lineup stats with improved stacking adjustment
 */
export function calculateLineupStatsWithStacking(
  picks: Connection[]
): {
  mu: number;
  variance: number;
  sigma: number;
  muSmooth: number;
  varianceSmooth: number;
  sigmaSmooth: number;
  uniqueHorses: number;
  stackedHorses: number;
  stackingAdjustment: number;
} {
  if (picks.length === 0) {
    return {
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      uniqueHorses: 0,
      stackedHorses: 0,
      stackingAdjustment: 0,
    };
  }

  const horseToPicksMap = new Map<string, { pick: Connection; perHorseVar: number; perHorseVarSmooth: number }[]>();
  
  picks.forEach((pick) => {
    const numHorses = pick.horseIds.length || 1;
    pick.horseIds.forEach((horseId) => {
      const existing = horseToPicksMap.get(horseId) || [];
      existing.push({
        pick,
        perHorseVar: pick.variance / numHorses,
        perHorseVarSmooth: pick.varianceSmooth / numHorses,
      });
      horseToPicksMap.set(horseId, existing);
    });
  });

  const uniqueHorses = horseToPicksMap.size;
  let stackedHorses = 0;
  let adjustedVariance = 0;
  let adjustedVarianceSmooth = 0;
  
  horseToPicksMap.forEach((pickList) => {
    if (pickList.length > 1) {
      stackedHorses++;
      const sumSigma = pickList.reduce((sum, p) => sum + Math.sqrt(p.perHorseVar), 0);
      const sumSigmaSmooth = pickList.reduce((sum, p) => sum + Math.sqrt(p.perHorseVarSmooth), 0);
      adjustedVariance += sumSigma * sumSigma;
      adjustedVarianceSmooth += sumSigmaSmooth * sumSigmaSmooth;
    } else {
      adjustedVariance += pickList[0].perHorseVar;
      adjustedVarianceSmooth += pickList[0].perHorseVarSmooth;
    }
  });

  const mu = picks.reduce((sum, p) => sum + p.mu, 0);
  const muSmooth = picks.reduce((sum, p) => sum + p.muSmooth, 0);
  const naiveVariance = picks.reduce((sum, p) => sum + p.variance, 0);
  const stackingAdjustment = adjustedVariance - naiveVariance;

  return {
    mu,
    variance: adjustedVariance,
    sigma: Math.sqrt(adjustedVariance),
    muSmooth,
    varianceSmooth: adjustedVarianceSmooth,
    sigmaSmooth: Math.sqrt(adjustedVarianceSmooth),
    uniqueHorses,
    stackedHorses,
    stackingAdjustment,
  };
}

/**
 * Clear all caches (useful for development/debugging)
 */
export function clearCaches(): void {
  trackCache.clear();
  trackMetadataCache = null;
  if (typeof window !== 'undefined') {
    // Clear session storage cache
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}
