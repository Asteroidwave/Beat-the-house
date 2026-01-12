'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Connection, 
  Pick, 
  LineupStats, 
  GameResult, 
  HorseEntry, 
  RaceInfo, 
  MultiplierTier, 
  GameHistoryEntry,
  TargetThreshold,
  OddsBucketStats,
  AvailableDate,
  FilterState,
  ConnectionHighlight,
} from '@/types';
import { 
  getDataForDate, 
  calculateExpectedPoints, 
  calculateActualPoints,
  calculateLineupStatsWithStacking,
  getAvailableDates,
} from '@/lib/parseExcel';
import { calculateTargets, determineAchievedTier } from '@/lib/oddsStatistics';

const SALARY_MIN = 20000;
const SALARY_MAX = 50000;
const STAKE_MIN = 5;
const STAKE_MAX = 1000;
const INITIAL_BANKROLL = 10000;

// Colors for multi-select player filtering
const HIGHLIGHT_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-500' },
  { bg: 'bg-purple-500', light: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-500' },
  { bg: 'bg-pink-500', light: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-500' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-500' },
  { bg: 'bg-orange-500', light: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-500' },
];

// Default multiplier tiers with calibrated z-values for 80% player return
// Calibrated from 50k+ lineup simulations across 8 tracks (AQU, GP, SA, DMR, PRX, PEN, LRL, MVR)
export const DEFAULT_MULTIPLIER_TIERS: MultiplierTier[] = [
  { multiplier: 0.5, threshold: 80, label: '0.5x', color: '#94a3b8', zValue: 3.15 },  // 75.7% hit
  { multiplier: 2, threshold: 110, label: '2x', color: '#22c55e', zValue: 5.35 },    // 20.1% hit
  { multiplier: 3, threshold: 130, label: '3x', color: '#3b82f6', zValue: 6.00 },    // 11.9% hit
  { multiplier: 5, threshold: 160, label: '5x', color: '#a855f7', zValue: 11.90 },   // 0.1% hit
];

// For backwards compatibility
export const MULTIPLIER_TIERS = DEFAULT_MULTIPLIER_TIERS;

interface GameContextType {
  // Data
  races: RaceInfo[];
  connections: Connection[];
  horses: HorseEntry[];
  oddsBucketStats: Map<string, OddsBucketStats>;
  isLoading: boolean;
  
  // Date selection
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  availableDates: AvailableDate[];
  
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // Picks
  picks: Pick[];
  addPick: (connection: Connection) => void;
  removePick: (connectionId: string) => void;
  clearPicks: () => void;
  isConnectionPicked: (connectionId: string) => boolean;
  
  // Stats
  lineupStats: LineupStats;
  
  // Dynamic targets based on lineup μ/σ
  targets: TargetThreshold[];
  
  // Salary
  salaryMin: number;
  salaryMax: number;
  isSalaryValid: boolean;
  
  // Stake (no multiplier selection - it's determined by results)
  stake: number;
  setStake: (stake: number) => void;
  stakeMin: number;
  stakeMax: number;
  
  // Bankroll & History
  bankroll: number;
  gameHistory: GameHistoryEntry[];
  totalWins: number;
  totalLosses: number;
  totalWonAmount: number;
  totalLostAmount: number;
  
  // Filtering
  filterState: FilterState;
  togglePlayerFilter: (connection: Connection) => void;
  toggleHorseFilter: (raceNumber: number, horseName: string, horseId: string) => void;
  clearPlayerFilters: () => void;
  clearHorseFilters: () => void;
  clearAllFilters: () => void;
  getPlayerHighlightColor: (connectionId: string) => typeof HIGHLIGHT_COLORS[0] | null;
  
  // Game flow
  canPlay: boolean;
  play: () => void;
  gamePhase: 'picking' | 'results';
  gameResult: GameResult | null;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [horses, setHorses] = useState<HorseEntry[]>([]);
  const [oddsBucketStats, setOddsBucketStats] = useState<Map<string, OddsBucketStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  // Date selection
  const [selectedDate, setSelectedDateState] = useState('2025-12-12');
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  
  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState(STAKE_MIN);
  const [gamePhase, setGamePhase] = useState<'picking' | 'results'>('picking');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  // Filtering
  const [filterState, setFilterState] = useState<FilterState>({
    selectedPlayers: [],
    selectedHorses: [],
  });
  
  // Bankroll & History - persist to localStorage
  const [bankroll, setBankroll] = useState(INITIAL_BANKROLL);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);

  // Load saved state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBankroll = localStorage.getItem('bth_bankroll');
      const savedHistory = localStorage.getItem('bth_history');
      const savedTheme = localStorage.getItem('bth_theme') as 'dark' | 'light' | null;
      if (savedBankroll) setBankroll(Number(savedBankroll));
      if (savedHistory) setGameHistory(JSON.parse(savedHistory));
      if (savedTheme) setTheme(savedTheme);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bth_bankroll', bankroll.toString());
      localStorage.setItem('bth_history', JSON.stringify(gameHistory));
      localStorage.setItem('bth_theme', theme);
    }
  }, [bankroll, gameHistory, theme]);
  
  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);
  
  // Load available dates on mount
  useEffect(() => {
    const loadDates = async () => {
      try {
        const dates = await getAvailableDates();
        setAvailableDates(dates);
      } catch (error) {
        console.error('Failed to load available dates:', error);
      }
    };
    loadDates();
  }, []);
  
  // Load data for selected date
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await getDataForDate(selectedDate);
        setRaces(data.races);
        setConnections(data.connections);
        setHorses(data.horses);
        setOddsBucketStats(data.oddsBucketStats);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedDate]);
  
  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date);
    // Clear picks when changing date
    setPicks([]);
    setStake(STAKE_MIN);
    setFilterState({ selectedPlayers: [], selectedHorses: [] });
  }, []);
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);
  
  // Calculate lineup stats with stacking adjustment
  const lineupStats: LineupStats = useMemo(() => {
    if (picks.length === 0) {
      return { 
        totalSalary: 0, 
        totalApps: 0, 
        avgOdds: 0, 
        expectedPoints: 0,
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
    
    const totalSalary = picks.reduce((sum, p) => sum + p.connection.salary, 0);
    const totalApps = picks.reduce((sum, p) => sum + p.connection.apps, 0);
    const avgOdds = picks.reduce((sum, p) => sum + p.connection.avgOdds, 0) / picks.length;
    const expectedPoints = calculateExpectedPoints(picks.map(p => p.connection));
    
    // Calculate μ/σ with stacking adjustment
    const stackingStats = calculateLineupStatsWithStacking(picks.map(p => p.connection));
    
    return { 
      totalSalary, 
      totalApps, 
      avgOdds, 
      expectedPoints,
      ...stackingStats,
    };
  }, [picks]);
  
  // Calculate dynamic targets based on lineup μ and σ (using smoothed values)
  const targets: TargetThreshold[] = useMemo(() => {
    return calculateTargets(lineupStats.muSmooth, lineupStats.sigmaSmooth, stake);
  }, [lineupStats.muSmooth, lineupStats.sigmaSmooth, stake]);
  
  const isSalaryValid = lineupStats.totalSalary >= SALARY_MIN && lineupStats.totalSalary <= SALARY_MAX;
  const canPlay = isSalaryValid && stake >= STAKE_MIN && stake <= STAKE_MAX && stake <= bankroll && lineupStats.mu > 0;
  
  // Computed stats
  const totalWins = gameHistory.filter(g => g.isWin).length;
  const totalLosses = gameHistory.filter(g => !g.isWin).length;
  const totalWonAmount = gameHistory.filter(g => g.isWin).reduce((sum, g) => sum + g.payout, 0);
  const totalLostAmount = gameHistory.filter(g => !g.isWin).reduce((sum, g) => sum + g.stake, 0);
  
  const addPick = useCallback((connection: Connection) => {
    setPicks(prev => {
      if (prev.some(p => p.connection.id === connection.id)) return prev;
      const newPicks = [...prev, { connection, addedAt: Date.now() }];
      const newTotal = newPicks.reduce((sum, p) => sum + p.connection.salary, 0);
      if (newTotal > SALARY_MAX) return prev;
      return newPicks;
    });
  }, []);
  
  const removePick = useCallback((connectionId: string) => {
    setPicks(prev => prev.filter(p => p.connection.id !== connectionId));
  }, []);
  
  const clearPicks = useCallback(() => {
    setPicks([]);
    setStake(STAKE_MIN);
  }, []);
  
  const isConnectionPicked = useCallback((connectionId: string) => {
    return picks.some(p => p.connection.id === connectionId);
  }, [picks]);
  
  // Filtering functions
  const togglePlayerFilter = useCallback((connection: Connection) => {
    setFilterState(prev => {
      const isSelected = prev.selectedPlayers.some(p => p.id === connection.id);
      if (isSelected) {
        return {
          ...prev,
          selectedPlayers: prev.selectedPlayers.filter(p => p.id !== connection.id),
        };
      } else {
        return {
          ...prev,
          selectedPlayers: [...prev.selectedPlayers, connection],
        };
      }
    });
  }, []);
  
  const toggleHorseFilter = useCallback((raceNumber: number, horseName: string, horseId: string) => {
    setFilterState(prev => {
      const isSelected = prev.selectedHorses.some(h => h.horseId === horseId);
      if (isSelected) {
        return {
          ...prev,
          selectedHorses: prev.selectedHorses.filter(h => h.horseId !== horseId),
        };
      } else {
        return {
          ...prev,
          selectedHorses: [...prev.selectedHorses, { raceNumber, horseName, horseId }],
        };
      }
    });
  }, []);
  
  const clearPlayerFilters = useCallback(() => {
    setFilterState(prev => ({ ...prev, selectedPlayers: [] }));
  }, []);
  
  const clearHorseFilters = useCallback(() => {
    setFilterState(prev => ({ ...prev, selectedHorses: [] }));
  }, []);
  
  const clearAllFilters = useCallback(() => {
    setFilterState({ selectedPlayers: [], selectedHorses: [] });
  }, []);
  
  const getPlayerHighlightColor = useCallback((connectionId: string) => {
    const index = filterState.selectedPlayers.findIndex(p => p.id === connectionId);
    if (index === -1) return null;
    return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
  }, [filterState.selectedPlayers]);
  
  const play = useCallback(() => {
    if (!canPlay) return;
    
    const pickedConnections = picks.map(p => p.connection);
    const actualPointsMap = calculateActualPoints(pickedConnections, horses);
    const actualPoints = Array.from(actualPointsMap.values()).reduce((sum, pts) => sum + pts, 0);
    
    // Create picks with actual points
    const picksWithActual: Pick[] = picks.map(p => ({
      ...p,
      actualPoints: actualPointsMap.get(p.connection.id) || 0,
    }));
    
    // Determine which tier was achieved
    const achievedTier = determineAchievedTier(actualPoints, targets);
    const isWin = achievedTier !== null;
    const payout = isWin ? achievedTier!.payout : 0;
    
    // Update bankroll
    const newBankroll = bankroll - stake + payout;
    setBankroll(newBankroll);
    
    // Add to history with actual points per pick
    const historyEntry: GameHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      picks: picksWithActual,
      lineupStats: { ...lineupStats },
      actualPoints,
      targets: [...targets],
      achievedTier,
      stake,
      payout,
      isWin,
      balanceAfter: newBankroll,
    };
    setGameHistory(prev => [historyEntry, ...prev]);
    
    const result: GameResult = {
      picks: picksWithActual,
      lineupStats: { ...lineupStats },
      actualPoints,
      targets: [...targets],
      achievedTier,
      stake,
      payout,
      isWin,
    };
    
    setGameResult(result);
    setGamePhase('results');
  }, [canPlay, picks, horses, stake, bankroll, targets, lineupStats]);
  
  const resetGame = useCallback(() => {
    clearPicks();
    setGameResult(null);
    setGamePhase('picking');
    clearAllFilters();
  }, [clearPicks, clearAllFilters]);
  
  return (
    <GameContext.Provider
      value={{
        races,
        connections,
        horses,
        oddsBucketStats,
        isLoading,
        selectedDate,
        setSelectedDate,
        availableDates,
        theme,
        toggleTheme,
        picks,
        addPick,
        removePick,
        clearPicks,
        isConnectionPicked,
        lineupStats,
        targets,
        salaryMin: SALARY_MIN,
        salaryMax: SALARY_MAX,
        isSalaryValid,
        stake,
        setStake,
        stakeMin: STAKE_MIN,
        stakeMax: STAKE_MAX,
        bankroll,
        gameHistory,
        totalWins,
        totalLosses,
        totalWonAmount,
        totalLostAmount,
        filterState,
        togglePlayerFilter,
        toggleHorseFilter,
        clearPlayerFilters,
        clearHorseFilters,
        clearAllFilters,
        getPlayerHighlightColor,
        canPlay,
        play,
        gamePhase,
        gameResult,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
