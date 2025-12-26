# Beat The House - Salary Cap Fantasy 🏇

A horse racing fantasy game where you pick connections (jockeys, trainers, sires) and try to beat the house's expected points based on 90-day AVPA.

## Game Concept

1. **Build Your Lineup**: Select jockeys, trainers, and sires from the day's races
2. **Salary Cap**: Stay within $20,000 - $50,000 total salary
3. **Beat The House**: The house calculates expected points using 90-day AVPA
4. **Choose Your Risk**: Select a multiplier (0.5x, 2x, 3x, or 5x)
5. **Win Big**: If your picks score more than the threshold, you win!

## Multiplier Tiers

| Multiplier | Threshold | Risk Level |
|------------|-----------|------------|
| 0.5x | 80% of expected | Low (consolation) |
| 2x | 110% of expected | Medium |
| 3x | 130% of expected | High |
| 5x | 160% of expected | Very High |

## Features

- **3-Panel Layout**:
  - **Starters**: Browse races and horses with their connections
  - **Players**: Filter by role (All/Jockeys/Trainers/Sires), sort by salary/apps/odds
  - **Picks**: Build your lineup, select multiplier, place stake

- **Live Stats**: Watch your lineup stats update as you pick
  - Total Picks, Apps, Avg Odds, Expected Points
  - Salary progress bar with $20k minimum threshold

- **Results View**: 
  - Win/Loss display with trophy animation
  - Expected vs Actual points comparison
  - Individual pick breakdown showing over/under performance

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS** for styling
- **XLSX** for parsing Excel data

## Data Source

Uses `AQU_20251101_V6_COMPLETE.xlsx` containing:
- Horse entries with race data
- Jockey/Trainer/Sire daily performance
- 90-day AVPA statistics for expected points calculation

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Game Rules

1. Each connection can only be picked once
2. Minimum salary: $20,000
3. Maximum salary: $50,000
4. Minimum stake: $5
5. Maximum stake: $1,000
6. Expected Points = Σ(Connection 90d AVPA × Appearances)

## Screenshots

The game features a dark, sophisticated racing aesthetic with:
- Green accents for positive actions
- Color-coded connection types (Blue=Jockey, Red=Trainer, Green=Sire)
- Smooth animations and transitions

---

Built with ❤️ for horse racing enthusiasts
