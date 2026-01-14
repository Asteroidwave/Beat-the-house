/**
 * Convert Excel files to JSON for faster loading
 * Run with: node scripts/convertExcelToJson.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TRACKS = [
  { code: 'AQU', file: 'AQU_20250101_V11_COMPLETE.xlsx' },
  { code: 'SA', file: 'SA_20250101_V11_COMPLETE.xlsx' },
  { code: 'GP', file: 'GP_20250101_V11_COMPLETE.xlsx' },
  { code: 'DMR', file: 'DMR_20250101_V11_COMPLETE.xlsx' },
  { code: 'PRX', file: 'PRX_20250101_V11_COMPLETE.xlsx' },
  { code: 'PEN', file: 'PEN_20250101_V11_COMPLETE.xlsx' },
  { code: 'LRL', file: 'LRL_20250101_V11_COMPLETE.xlsx' },
  { code: 'MVR', file: 'MVR_20250101_V11_COMPLETE.xlsx' },
];

// Track metadata for quick loading
const trackMetadata = [];

TRACKS.forEach(track => {
  const filePath = path.join(PUBLIC_DIR, track.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${track.code}: File not found`);
    return;
  }
  
  console.log(`Processing ${track.code}...`);
  
  const workbook = XLSX.readFile(filePath);
  
  // Parse all sheets
  const horses = XLSX.utils.sheet_to_json(workbook.Sheets['Horses']);
  const jockeys = XLSX.utils.sheet_to_json(workbook.Sheets['Jockeys']);
  const trainers = XLSX.utils.sheet_to_json(workbook.Sheets['Trainers']);
  const sires = XLSX.utils.sheet_to_json(workbook.Sheets['Sires']);
  const jockeyStats = XLSX.utils.sheet_to_json(workbook.Sheets['Jockey Stats']);
  const trainerStats = XLSX.utils.sheet_to_json(workbook.Sheets['Trainer Stats']);
  const sireStats = XLSX.utils.sheet_to_json(workbook.Sheets['Sire Stats']);
  
  // Transform horses data
  const transformedHorses = horses.map(row => ({
    date: row.Date,
    race: row.Race,
    horse: row.Horse,
    pp: row.PP,
    jockey: row.Jockey,
    trainer: row.Trainer,
    sire1: row['Sire 1'],
    sire2: row['Sire 2'] || null,
    mlOdds: row['OG M/L'],
    mlOddsDecimal: row['OG M/L Dec'] || 0,
    newMlOdds: row['New M/L'] || null,
    newMlOddsDecimal: row['New M/L Dec'] || null,
    salary: row['New Sal.'] || 0,
    finish: row.Finish || 0,
    totalPoints: row['Total Points'] || 0,
    avpa: row.AVPA || 0,
    raceAvpa: row['Race AVPA'] || 0,
    trackAvpa: row['Track AVPA'] || 0,
    isScratched: row.Horse?.includes('SCR') || row.Finish === 0 || !row.Finish,
  }));
  
  // Transform connections data
  const transformConnection = (row) => ({
    date: row.Date,
    name: row.Name,
    salary: row['New Sal.'] || 0,
    apps: row['New Apps'] || 0,
    avgOdds: row['New Avg. Odds'] || 0,
    totalPoints: row['Total Points'] || 0,
    trackAvpa: row['Track AVPA'] || 0,
    wins: row.Win || 0,
    places: row.Place || 0,
    shows: row.Show || 0,
    winPct: row['Win %'] || 0,
    itmPct: row['ITM %'] || 0,
  });
  
  const transformedJockeys = jockeys.map(transformConnection);
  const transformedTrainers = trainers.map(transformConnection);
  const transformedSires = sires.map(transformConnection);
  
  // Transform stats data
  const transformStats = (row) => ({
    name: row.Name,
    salary: row['New Salary'] || 0,
    starts: row.Starts || 0,
    totalPoints: row['Total Points'] || 0,
    avpa: row.AVPA || 0,
    avpa90d: row['90d AVPA'] || 0,
    wins: row.Wins || 0,
    places: row.Places || 0,
    shows: row.Shows || 0,
    winPct: row['Win %'] || 0,
    itmPct: row['ITM %'] || 0,
  });
  
  const transformedJockeyStats = jockeyStats.map(transformStats);
  const transformedTrainerStats = trainerStats.map(transformStats);
  const transformedSireStats = sireStats.map(transformStats);
  
  // Get unique dates for metadata
  const dates = [...new Set(transformedHorses.map(h => h.date))].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  // Write JSON file for this track
  const trackData = {
    trackCode: track.code,
    horses: transformedHorses,
    jockeys: transformedJockeys,
    trainers: transformedTrainers,
    sires: transformedSires,
    jockeyStats: transformedJockeyStats,
    trainerStats: transformedTrainerStats,
    sireStats: transformedSireStats,
    dates,
  };
  
  const outputPath = path.join(DATA_DIR, `${track.code}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(trackData));
  
  // Calculate file sizes for comparison
  const xlsxSize = fs.statSync(filePath).size;
  const jsonSize = fs.statSync(outputPath).size;
  
  console.log(`  ${track.code}: ${transformedHorses.length} horses, ${dates.length} dates`);
  console.log(`  Excel: ${(xlsxSize / 1024).toFixed(1)}KB → JSON: ${(jsonSize / 1024).toFixed(1)}KB`);
  
  // Add to metadata
  trackMetadata.push({
    code: track.code,
    name: getTrackName(track.code),
    dates,
    horseCount: transformedHorses.length,
    raceCount: [...new Set(transformedHorses.map(h => `${h.date}-${h.race}`))].length,
  });
});

// Write metadata file for quick track listing
const metadataPath = path.join(DATA_DIR, 'tracks.json');
fs.writeFileSync(metadataPath, JSON.stringify(trackMetadata, null, 2));
console.log(`\nWrote tracks.json with ${trackMetadata.length} tracks`);

function getTrackName(code) {
  const names = {
    'AQU': 'Aqueduct',
    'SA': 'Santa Anita',
    'GP': 'Gulfstream Park',
    'DMR': 'Del Mar',
    'PRX': 'Parx Racing',
    'PEN': 'Penn National',
    'LRL': 'Laurel Park',
    'MVR': 'Mountaineer',
  };
  return names[code] || code;
}

console.log('\n✓ Conversion complete! JSON files are in public/data/');
