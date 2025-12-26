import * as XLSX from 'xlsx';
import { Connection, HorseEntry, RaceInfo } from '@/types';

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

let cachedData: {
  horses: HorseEntry[];
  jockeys: Map<string, Connection>;
  trainers: Map<string, Connection>;
  sires: Map<string, Connection>;
  stats: {
    jockeys: Map<string, { avpa90d: number }>;
    trainers: Map<string, { avpa90d: number }>;
    sires: Map<string, { avpa90d: number }>;
  };
} | null = null;

export async function loadExcelData() {
  if (cachedData) return cachedData;

  const response = await fetch('/AQU_20251101_V6_COMPLETE.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Parse Horses sheet
  const horsesSheet = workbook.Sheets['Horses'];
  const horsesRaw: RawHorseRow[] = XLSX.utils.sheet_to_json(horsesSheet);

  const horses: HorseEntry[] = horsesRaw.map((row) => ({
    date: row.Date,
    race: row.Race,
    horse: row.Horse,
    pp: row.PP,
    jockey: row.Jockey,
    trainer: row.Trainer,
    sire1: row['Sire 1'],
    sire2: row['Sire 2'],
    mlOdds: row['OG M/L'],
    mlOddsDecimal: row['OG M/L Dec'],
    salary: row['New Sal.'] || 0,
    finish: row.Finish,
    totalPoints: row['Total Points'] || 0,
    avpa: row.AVPA || 0,
    raceAvpa: row['Race AVPA'] || 0,
    trackAvpa: row['Track AVPA'] || 0,
    isScratched: row.Horse?.includes('SCR') || row.Finish === 0 || !row.Finish,
  }));

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
      avpa90d: 0, // Will be filled from stats
      trackAvpa: row['Track AVPA'] || 0,
      totalPoints: row['Total Points'] || 0,
      wins: row.Win || 0,
      places: row.Place || 0,
      shows: row.Show || 0,
      winPct: row['Win %'] || 0,
      itmPct: row['ITM %'] || 0,
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

  cachedData = {
    horses,
    jockeys,
    trainers,
    sires,
    stats: {
      jockeys: jockeyStats,
      trainers: trainerStats,
      sires: sireStats,
    },
  };

  return cachedData;
}

export async function getDataForDate(date: string) {
  const data = await loadExcelData();

  // Filter horses for this date
  const dayHorses = data.horses.filter((h) => h.date === date);

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

  // Get connections for this date with 90d AVPA
  const connections: Connection[] = [];
  const seenConnections = new Set<string>();

  // Add jockeys
  data.jockeys.forEach((conn, key) => {
    if (key.startsWith(date)) {
      const stats = data.stats.jockeys.get(conn.name);
      if (!seenConnections.has(conn.id)) {
        connections.push({
          ...conn,
          avpa90d: stats?.avpa90d || conn.trackAvpa || 0,
        });
        seenConnections.add(conn.id);
      }
    }
  });

  // Add trainers
  data.trainers.forEach((conn, key) => {
    if (key.startsWith(date)) {
      const stats = data.stats.trainers.get(conn.name);
      if (!seenConnections.has(conn.id)) {
        connections.push({
          ...conn,
          avpa90d: stats?.avpa90d || conn.trackAvpa || 0,
        });
        seenConnections.add(conn.id);
      }
    }
  });

  // Add sires
  data.sires.forEach((conn, key) => {
    if (key.startsWith(date)) {
      const stats = data.stats.sires.get(conn.name);
      if (!seenConnections.has(conn.id)) {
        connections.push({
          ...conn,
          avpa90d: stats?.avpa90d || conn.trackAvpa || 0,
        });
        seenConnections.add(conn.id);
      }
    }
  });

  return { races, connections, horses: dayHorses };
}

export function calculateExpectedPoints(picks: Connection[]): number {
  return picks.reduce((sum, conn) => {
    // Expected points = 90d AVPA * number of appearances
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

