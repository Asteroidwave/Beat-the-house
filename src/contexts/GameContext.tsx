'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Connection, Pick, LineupStats, GameResult, HorseEntry, RaceInfo, MultiplierTier, GameHistoryEntry } from '@/types';
import { getDataForDate, calculateExpectedPoints, calculateActualPoints } from '@/lib/parseExcel';

const SALARY_MIN = 20000;
const SALARY_MAX = 50000;
const STAKE_MIN = 5;
const STAKE_MAX = 1000;
const INITIAL_BANKROLL = 10000;

export const MULTIPLIER_TIERS: MultiplierTier[] = [
  { multiplier: 0.5, threshold: 80, label: '0.5x', color: '#94a3b8' },
  { multiplier: 2, threshold: 110, label: '2x', color: '#22c55e' },
  { multiplier: 3, threshold: 130, label: '3x', color: '#3b82f6' },
  { multiplier: 5, threshold: 160, label: '5x', color: '#a855f7' },
];

interface GameContextType {
  // Data
  races: RaceInfo[];
  connections: Connection[];
  horses: HorseEntry[];
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
  
  // Salary
  salaryMin: number;
  salaryMax: number;
  isSalaryValid: boolean;
  
  // Multiplier & Stake
  selectedMultiplier: MultiplierTier | null;
  setSelectedMultiplier: (tier: MultiplierTier | null) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const selectedDate = '2025-12-12'; // Dec 12
  
  const [picks, setPicks] = useState<Pick[]>([]);
  const [selectedMultiplier, setSelectedMultiplier] = useState<MultiplierTier | null>(null);
  const [stake, setStake] = useState(STAKE_MIN);
  const [gamePhase, setGamePhase] = useState<'picking' | 'results'>('picking');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  // Bankroll & History
  const [bankroll, setBankroll] = useState(INITIAL_BANKROLL);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getDataForDate(selectedDate);
        setRaces(data.races);
        setConnections(data.connections);
        setHorses(data.horses);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedDate]);
  
  // Calculate lineup stats
  const lineupStats: LineupStats = React.useMemo(() => {
    if (picks.length === 0) {
      return { totalSalary: 0, totalApps: 0, avgOdds: 0, expectedPoints: 0 };
    }
    
    const totalSalary = picks.reduce((sum, p) => sum + p.connection.salary, 0);
    const totalApps = picks.reduce((sum, p) => sum + p.connection.apps, 0);
    const avgOdds = picks.reduce((sum, p) => sum + p.connection.avgOdds, 0) / picks.length;
    const expectedPoints = calculateExpectedPoints(picks.map(p => p.connection));
    
    return { totalSalary, totalApps, avgOdds, expectedPoints };
  }, [picks]);
  
  const isSalaryValid = lineupStats.totalSalary >= SALARY_MIN && lineupStats.totalSalary <= SALARY_MAX;
  const canPlay = isSalaryValid && selectedMultiplier !== null && stake >= STAKE_MIN && stake <= STAKE_MAX && stake <= bankroll;
  
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
    setSelectedMultiplier(null);
    setStake(STAKE_MIN);
  }, []);
  
  const isConnectionPicked = useCallback((connectionId: string) => {
    return picks.some(p => p.connection.id === connectionId);
  }, [picks]);
  
  const play = useCallback(() => {
    if (!canPlay || !selectedMultiplier) return;
    
    const pickedConnections = picks.map(p => p.connection);
    const expectedPoints = calculateExpectedPoints(pickedConnections);
    const actualPointsMap = calculateActualPoints(pickedConnections, horses);
    const actualPoints = Array.from(actualPointsMap.values()).reduce((sum, pts) => sum + pts, 0);
    
    const targetPoints = (expectedPoints * selectedMultiplier.threshold) / 100;
    const isWin = actualPoints >= targetPoints;
    const payout = isWin ? stake * selectedMultiplier.multiplier : 0;
    
    // Update bankroll
    const newBankroll = bankroll - stake + payout;
    setBankroll(newBankroll);
    
    // Add to history
    const historyEntry: GameHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      picks: [...picks],
      expectedPoints,
      actualPoints,
      targetPoints,
      multiplier: selectedMultiplier,
      stake,
      payout,
      isWin,
      balanceAfter: newBankroll,
    };
    setGameHistory(prev => [historyEntry, ...prev]);
    
    const result: GameResult = {
      picks: [...picks],
      expectedPoints,
      actualPoints,
      targetPoints,
      selectedMultiplier,
      stake,
      payout,
      isWin,
    };
    
    setGameResult(result);
    setGamePhase('results');
  }, [canPlay, selectedMultiplier, picks, horses, stake, bankroll]);
  
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
        isLoading,
        selectedDate,
        picks,
        addPick,
        removePick,
        clearPicks,
        isConnectionPicked,
        lineupStats,
        salaryMin: SALARY_MIN,
        salaryMax: SALARY_MAX,
        isSalaryValid,
        selectedMultiplier,
        setSelectedMultiplier,
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
