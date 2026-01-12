import * as XLSX from 'xlsx';
import { Connection, HorseEntry, RaceInfo, OddsBucketStats, AvailableDate } from '@/types';
import { buildOddsBucketStats, getHorseStats } from './oddsStatistics';

// Minimum scratches threshold - dates with more than this many scratches are excluded
const MAX_SCRATCHES_PER_DAY = 10;

// Available tracks
export const AVAILABLE_TRACKS = [
  { code: 'AQU', name: 'Aqueduct', file: 'AQU_20250101_V11_COMPLETE.xlsx' },
  { code: 'SA', name: 'Santa Anita', file: 'SA_20250101_V11_COMPLETE.xlsx' },
  { code: 'GP', name: 'Gulfstream Park', file: 'GP_20250101_V11_COMPLETE.xlsx' },
  { code: 'DMR', name: 'Del Mar', file: 'DMR_20250101_V11_COMPLETE.xlsx' },
  { code: 'PRX', name: 'Parx Racing', file: 'PRX_20250101_V11_COMPLETE.xlsx' },
  { code: 'PEN', name: 'Penn National', file: 'PEN_20250101_V11_COMPLETE.xlsx' },
  { code: 'LRL', name: 'Laurel Park', file: 'LRL_20250101_V11_COMPLETE.xlsx' },
  { code: 'MVR', name: 'Mountaineer', file: 'MVR_20250101_V11_COMPLETE.xlsx' },
];

interface RawHorseRow {
  Date: string;
  Race: number;
  Horse: string;
  PP: number;
  Jockey: string;
  Trainer: string;
  'Sire 1': string;
  'Sire 2'?: string;
  'OG M/L': string;
  'OG M/L Dec': number;
  'New M/L'?: string;
  'New M/L Dec'?: number;
  'New Sal.': number;
  Finish: number;
  'Total Points': number;
  AVPA: number;
  'Race AVPA': number;
  'Track AVPA': number;
}

interface RawConnectionRow {
  Date: string;
  Name: string;
  'New Sal.': number;
  'New Apps': number;
  'New Avg. Odds': number;
  'Total Points': number;
  AVPA: number;
  'Track AVPA': number;
  Win: number;
  Place: number;
  Show: number;
  'Win %': number;
  'ITM %': number;
}

interface RawStatsRow {
  Name: string;
  'New Salary': number;
  Starts: number;
  'Total Points': number;
  AVPA: number;
  '90d AVPA': number;
  Wins: number;
  Places: number;
  Shows: number;
  'Win %': number;
  'ITM %': number;
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

// Cache for loaded track data
const trackCache = new Map<string, TrackData>();

/**
 * Load data for a specific track
 */
export async function loadTrackData(trackCode: string): Promise<TrackData> {
  // Check cache
  if (trackCache.has(trackCode)) {
    return trackCache.get(trackCode)!;
  }

  const track = AVAILABLE_TRACKS.find(t => t.code === trackCode);
  if (!track) {
    throw new Error(`Unknown track: ${trackCode}`);
  }

  const response = await fetch(`/${track.file}`);
  if (!response.ok) {
    throw new Error(`Failed to load data for ${trackCode}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Parse Horses sheet
  const horsesSheet = workbook.Sheets['Horses'];
  const horsesRaw: RawHorseRow[] = XLSX.utils.sheet_to_json(horsesSheet);

  // First pass: create horses without stats for bucket calculation
  const horsesWithoutStats = horsesRaw.map((row) => ({
    date: row.Date,
    race: row.Race,
    horse: row.Horse,
    pp: row.PP,
    jockey: row.Jockey,
    trainer: row.Trainer,
    sire1: row['Sire 1'],
    sire2: row['Sire 2'],
    mlOdds: row['OG M/L'],
    mlOddsDecimal: row['OG M/L Dec'] || 0,
    newMlOdds: row['New M/L'],
    newMlOddsDecimal: row['New M/L Dec'],
    salary: row['New Sal.'] || 0,
    finish: row.Finish || 0,
    totalPoints: row['Total Points'] || 0,
    avpa: row.AVPA || 0,
    raceAvpa: row['Race AVPA'] || 0,
    trackAvpa: row['Track AVPA'] || 0,
    isScratched: row.Horse?.includes('SCR') || row.Finish === 0 || !row.Finish,
  }));

  // Build odds bucket statistics from ALL horses (for overall stats)
  const oddsBucketStats = buildOddsBucketStats(horsesWithoutStats);

  // Second pass: add μ/σ to each horse based on their odds bucket
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

  // Parse Jockeys sheet
  const jockeysSheet = workbook.Sheets['Jockeys'];
  const jockeysRaw: RawConnectionRow[] = XLSX.utils.sheet_to_json(jockeysSheet);
  const jockeys = new Map<string, Connection>();

  jockeysRaw.forEach((row) => {
    const key = `${row.Date}-${row.Name}`;
    jockeys.set(key, {
      id: `jockey-${row.Name.replace(/\s+/g, '-').toLowerCase()}`,
      name: row.Name,
      role: 'jockey',
      salary: row['New Sal.'] || 0,
      apps: row['New Apps'] || 0,
      avgOdds: row['New Avg. Odds'] || 0,
      avpa90d: 0,
      trackAvpa: row['Track AVPA'] || 0,
      totalPoints: row['Total Points'] || 0,
      wins: row.Win || 0,
      places: row.Place || 0,
      shows: row.Show || 0,
      winPct: row['Win %'] || 0,
      itmPct: row['ITM %'] || 0,
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      horseIds: [],
    });
  });

  // Parse Trainers sheet
  const trainersSheet = workbook.Sheets['Trainers'];
  const trainersRaw: RawConnectionRow[] = XLSX.utils.sheet_to_json(trainersSheet);
  const trainers = new Map<string, Connection>();

  trainersRaw.forEach((row) => {
    const key = `${row.Date}-${row.Name}`;
    trainers.set(key, {
      id: `trainer-${row.Name.replace(/\s+/g, '-').toLowerCase()}`,
      name: row.Name,
      role: 'trainer',
      salary: row['New Sal.'] || 0,
      apps: row['New Apps'] || 0,
      avgOdds: row['New Avg. Odds'] || 0,
      avpa90d: 0,
      trackAvpa: row['Track AVPA'] || 0,
      totalPoints: row['Total Points'] || 0,
      wins: row.Win || 0,
      places: row.Place || 0,
      shows: row.Show || 0,
      winPct: row['Win %'] || 0,
      itmPct: row['ITM %'] || 0,
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      horseIds: [],
    });
  });

  // Parse Sires sheet
  const siresSheet = workbook.Sheets['Sires'];
  const siresRaw: RawConnectionRow[] = XLSX.utils.sheet_to_json(siresSheet);
  const sires = new Map<string, Connection>();

  siresRaw.forEach((row) => {
    const key = `${row.Date}-${row.Name}`;
    sires.set(key, {
      id: `sire-${row.Name.replace(/\s+/g, '-').toLowerCase()}`,
      name: row.Name,
      role: 'sire',
      salary: row['New Sal.'] || 0,
      apps: row['New Apps'] || 0,
      avgOdds: row['New Avg. Odds'] || 0,
      avpa90d: 0,
      trackAvpa: row['Track AVPA'] || 0,
      totalPoints: row['Total Points'] || 0,
      wins: row.Win || 0,
      places: row.Place || 0,
      shows: row.Show || 0,
      winPct: row['Win %'] || 0,
      itmPct: row['ITM %'] || 0,
      mu: 0,
      variance: 0,
      sigma: 0,
      muSmooth: 0,
      varianceSmooth: 0,
      sigmaSmooth: 0,
      horseIds: [],
    });
  });

  // Parse Stats sheets for 90d AVPA
  const jockeyStatsSheet = workbook.Sheets['Jockey Stats'];
  const jockeyStatsRaw: RawStatsRow[] = XLSX.utils.sheet_to_json(jockeyStatsSheet);
  const jockeyStats = new Map<string, { avpa90d: number }>();
  jockeyStatsRaw.forEach((row) => {
    jockeyStats.set(row.Name, { avpa90d: row['90d AVPA'] || 0 });
  });

  const trainerStatsSheet = workbook.Sheets['Trainer Stats'];
  const trainerStatsRaw: RawStatsRow[] = XLSX.utils.sheet_to_json(trainerStatsSheet);
  const trainerStats = new Map<string, { avpa90d: number }>();
  trainerStatsRaw.forEach((row) => {
    trainerStats.set(row.Name, { avpa90d: row['90d AVPA'] || 0 });
  });

  const sireStatsSheet = workbook.Sheets['Sire Stats'];
  const sireStatsRaw: RawStatsRow[] = XLSX.utils.sheet_to_json(sireStatsSheet);
  const sireStats = new Map<string, { avpa90d: number }>();
  sireStatsRaw.forEach((row) => {
    sireStats.set(row.Name, { avpa90d: row['90d AVPA'] || 0 });
  });

  // Get unique dates
  const dateSet = new Set<string>();
  horses.forEach(h => dateSet.add(h.date));
  const dates = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
    dates,
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
 * Get all available tracks with their race dates
 */
export async function getAvailableTracks(): Promise<{ code: string; name: string; dates: string[] }[]> {
  const tracks: { code: string; name: string; dates: string[] }[] = [];
  
  for (const track of AVAILABLE_TRACKS) {
    try {
      const data = await loadTrackData(track.code);
      
      // Filter dates with valid data
      const validDates = data.dates.filter(date => {
        const dayHorses = data.horses.filter(h => h.date === date);
        const scratches = dayHorses.filter(h => h.isScratched).length;
        const validHorses = dayHorses.length - scratches;
        return validHorses > 0 && scratches <= MAX_SCRATCHES_PER_DAY;
      });
      
      if (validDates.length > 0) {
        tracks.push({
          code: track.code,
          name: track.name,
          dates: validDates,
        });
      }
    } catch (error) {
      console.error(`Failed to load track ${track.code}:`, error);
    }
  }
  
  return tracks;
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
