'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
} from '@/types';
import { 
  getDataForDate, 
  calculateExpectedPoints, 
  calculateActualPoints,
  calculateLineupStatsWithStacking,
} from '@/lib/parseExcel';
import { calculateTargets, determineAchievedTier } from '@/lib/oddsStatistics';

const SALARY_MIN = 20000;
const SALARY_MAX = 50000;
const STAKE_MIN = 5;
const STAKE_MAX = 1000;
const INITIAL_BANKROLL = 10000;

// Multiplier tiers with z-values for dynamic targets
export const MULTIPLIER_TIERS: MultiplierTier[] = [
  { multiplier: 0.5, threshold: 80, label: '0.5x', color: '#94a3b8', zValue: -1.00 },
  { multiplier: 2, threshold: 110, label: '2x', color: '#22c55e', zValue: 0.03 },
  { multiplier: 3, threshold: 130, label: '3x', color: '#3b82f6', zValue: 0.53 },
  { multiplier: 5, threshold: 160, label: '5x', color: '#a855f7', zValue: 1.18 },
];

interface GameContextType {
  // Data
  races: RaceInfo[];
  connections: Connection[];
  horses: HorseEntry[];
  oddsBucketStats: Map<string, OddsBucketStats>;
  isLoading: boolean;
  selectedDate: string;
  
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
  const selectedDate = '2025-12-12'; // Dec 12
  
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState(STAKE_MIN);
  const [gamePhase, setGamePhase] = useState<'picking' | 'results'>('picking');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  // Bankroll & History - persist to localStorage
  const [bankroll, setBankroll] = useState(INITIAL_BANKROLL);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);

  // Load saved state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBankroll = localStorage.getItem('bth_bankroll');
      const savedHistory = localStorage.getItem('bth_history');
      if (savedBankroll) setBankroll(Number(savedBankroll));
      if (savedHistory) setGameHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bth_bankroll', bankroll.toString());
      localStorage.setItem('bth_history', JSON.stringify(gameHistory));
    }
  }, [bankroll, gameHistory]);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
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
  
  // Calculate lineup stats with stacking adjustment
  const lineupStats: LineupStats = React.useMemo(() => {
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
  const targets: TargetThreshold[] = React.useMemo(() => {
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
  
  const play = useCallback(() => {
    if (!canPlay) return;
    
    const pickedConnections = picks.map(p => p.connection);
    const actualPointsMap = calculateActualPoints(pickedConnections, horses);
    const actualPoints = Array.from(actualPointsMap.values()).reduce((sum, pts) => sum + pts, 0);
    
    // Determine which tier was achieved
    const achievedTier = determineAchievedTier(actualPoints, targets);
    const isWin = achievedTier !== null;
    const payout = isWin ? achievedTier!.payout : 0;
    
    // Update bankroll
    const newBankroll = bankroll - stake + payout;
    setBankroll(newBankroll);
    
    // Add to history
    const historyEntry: GameHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      picks: [...picks],
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
      picks: [...picks],
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
  }, [clearPicks]);
  
  return (
    <GameContext.Provider
      value={{
        races,
        connections,
        horses,
        oddsBucketStats,
        isLoading,
        selectedDate,
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
