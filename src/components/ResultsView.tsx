'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { TargetProgressBar } from './TargetProgressBar';
import { Trophy, XCircle, RotateCcw, TrendingUp, Wallet, History, CheckCircle, MinusCircle, Zap } from 'lucide-react';

const roleColors = {
  jockey: { bg: 'bg-blue-500', text: 'text-blue-500' },
  trainer: { bg: 'bg-green-500', text: 'text-green-500' },
  sire: { bg: 'bg-amber-500', text: 'text-amber-500' },
};

const roleLabels = {
  jockey: 'J',
  trainer: 'T',
  sire: 'S',
};

interface ResultsViewProps {
  onGoHome?: () => void;
}

export function ResultsView({ onGoHome }: ResultsViewProps) {
  const { gameResult, resetGame, bankroll, gameHistory, totalWins, totalLosses, totalWonAmount, totalLostAmount } = useGame();
  
  const handlePlayAgain = () => {
    resetGame();
    if (onGoHome) {
      onGoHome();
    }
  };

  if (!gameResult) return null;
  
  // Calculate totals
  const totalApps = gameResult.picks.reduce((sum, p) => sum + p.connection.apps, 0);
  const totalSalary = gameResult.picks.reduce((sum, p) => sum + p.connection.salary, 0);
  const totalExpected = gameResult.lineupStats.muSmooth;
  const totalActual = gameResult.actualPoints;
  const totalDiff = totalActual - totalExpected;
  
  // Calculate average odds
  const avgOdds = gameResult.picks.length > 0 
    ? gameResult.picks.reduce((sum, p) => sum + p.connection.avgOdds, 0) / gameResult.picks.length 
    : 0;
  
  // Determine total color: green if above expected, red if below, blue if equal (within 0.5)
  const getTotalColor = () => {
    if (totalDiff > 0.5) return 'text-success';
    if (totalDiff < -0.5) return 'text-error';
    return 'text-accent';
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Main Result Card - Green border for WIN, Red border for MISS */}
        <div className={`rounded-2xl p-6 mb-6 ${
          gameResult.isWin 
            ? 'bg-gradient-to-br from-success/20 to-success/5 border-2 border-success shadow-lg shadow-success/20' 
            : 'bg-gradient-to-br from-error/20 to-error/5 border-2 border-error shadow-lg shadow-error/20'
        }`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            {gameResult.isWin ? (
              <Trophy className="w-10 h-10 text-success" />
            ) : (
              <XCircle className="w-10 h-10 text-error" />
            )}
            <h1 className={`text-3xl font-bold ${gameResult.isWin ? 'text-success' : 'text-error'}`}>
              {gameResult.isWin ? 'You Won!' : 'Not This Time'}
            </h1>
          </div>
          
          {/* Achieved Tier */}
          {gameResult.achievedTier ? (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold" style={{ color: gameResult.achievedTier.color }}>
                HIT {gameResult.achievedTier.label} TARGET!
              </span>
              <span className="text-lg font-bold text-success">
                +${gameResult.payout.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="text-center text-text-muted mb-4">
              Didn't reach any target threshold
            </div>
          )}
          
          {/* Target Progress Bar with Results */}
          <div className="bg-surface/50 rounded-xl p-4 mb-4">
            <TargetProgressBar
              targets={gameResult.targets}
              actualPoints={gameResult.actualPoints}
              showResults={true}
              isActive={true}
              animatePositions={true}
            />
          </div>
          
          {/* Stats - Show μ and σ HERE */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-surface/30 rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">μ (Expected)</p>
              <p className="text-xl font-bold text-text-primary">{gameResult.lineupStats.muSmooth.toFixed(1)}</p>
            </div>
            <div className="bg-surface/30 rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">σ (Volatility)</p>
              <p className="text-xl font-bold text-text-secondary">{gameResult.lineupStats.sigmaSmooth.toFixed(1)}</p>
            </div>
            <div className="bg-surface/30 rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Actual</p>
              <p className={`text-xl font-bold ${gameResult.isWin ? 'text-success' : 'text-error'}`}>
                {gameResult.actualPoints.toFixed(1)}
              </p>
            </div>
            <div className="bg-surface/30 rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">
                {gameResult.isWin ? 'Payout' : 'Staked'}
              </p>
              <p className={`text-xl font-bold ${gameResult.isWin ? 'text-success' : 'text-error'}`}>
                ${gameResult.isWin ? gameResult.payout.toLocaleString() : gameResult.stake.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="panel p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Bankroll</p>
              <p className="text-lg font-bold text-text-primary">${bankroll.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="panel p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Wins</p>
              <p className="text-lg font-bold text-success">{totalWins}</p>
            </div>
          </div>
          
          <div className="panel p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
              <MinusCircle className="w-5 h-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Losses</p>
              <p className="text-lg font-bold text-error">{totalLosses}</p>
            </div>
          </div>
          
          <div className="panel p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Net P/L</p>
              <p className={`text-lg font-bold ${totalWonAmount - totalLostAmount >= 0 ? 'text-success' : 'text-error'}`}>
                ${(totalWonAmount - totalLostAmount).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Picks Breakdown - Enhanced with columns */}
        <div className="panel mb-6">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Your Picks Performance</h2>
          </div>
          
          {/* Column Headers */}
          <div className="px-4 py-2 bg-surface-elevated/30 grid grid-cols-12 gap-1 text-[10px] font-medium text-text-muted uppercase tracking-wider border-b border-border">
            <div className="col-span-4">Connection</div>
            <div className="col-span-1 text-center">Apps</div>
            <div className="col-span-2 text-center">Odds</div>
            <div className="col-span-2 text-center">Salary</div>
            <div className="col-span-1 text-center">Expected</div>
            <div className="col-span-2 text-center">Actual</div>
          </div>
          
          <div className="divide-y divide-border">
            {gameResult.picks.map((pick) => {
              const actual = pick.actualPoints ?? 0;
              const expected = pick.connection.muSmooth || 0;
              const diff = actual - expected;
              const performanceColor = diff > 0.5 ? 'text-success' : diff < -0.5 ? 'text-error' : 'text-accent';
              const bgColor = diff > 0.5 ? 'bg-success/5' : diff < -0.5 ? 'bg-error/5' : '';
              const colors = roleColors[pick.connection.role];
              
              return (
                <div key={pick.connection.id} className={`px-4 py-3 grid grid-cols-12 gap-1 items-center ${bgColor}`}>
                  {/* Connection Name */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold ${colors.bg} text-white`}>
                      {roleLabels[pick.connection.role]}
                    </div>
                    <span className="font-medium text-text-primary truncate">
                      {pick.connection.name}
                    </span>
                  </div>
                  
                  {/* Apps */}
                  <div className="col-span-1 text-center text-xs text-text-muted">
                    {pick.connection.apps}
                  </div>
                  
                  {/* Odds */}
                  <div className="col-span-2 text-center text-xs text-text-muted">
                    {pick.connection.avgOdds.toFixed(1)}
                  </div>
                  
                  {/* Salary */}
                  <div className="col-span-2 text-center text-xs text-text-secondary">
                    ${pick.connection.salary.toLocaleString()}
                  </div>
                  
                  {/* Expected */}
                  <div className="col-span-1 text-center text-xs text-text-muted">
                    {expected.toFixed(0)}
                  </div>
                  
                  {/* Actual with diff bubble */}
                  <div className="col-span-2 flex items-center justify-center gap-1">
                    <span className={`text-sm font-bold ${performanceColor}`}>
                      {actual.toFixed(0)}
                    </span>
                    <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                      diff > 0.5 ? 'bg-success/20 text-success' : 
                      diff < -0.5 ? 'bg-error/20 text-error' : 
                      'bg-accent/20 text-accent'
                    }`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Totals Row - Bolder styling */}
          <div className="px-4 py-3 bg-surface-elevated grid grid-cols-12 gap-1 items-center border-t-2 border-border">
            <div className="col-span-4 text-sm font-bold text-text-primary">TOTAL</div>
            <div className="col-span-1 text-center text-sm font-semibold text-text-secondary">
              {totalApps}
            </div>
            <div className="col-span-2 text-center text-sm font-semibold text-text-secondary">
              {avgOdds.toFixed(1)}
            </div>
            <div className="col-span-2 text-center text-sm font-semibold text-text-primary">
              ${totalSalary.toLocaleString()}
            </div>
            <div className="col-span-1 text-center text-sm font-semibold text-text-secondary">
              {totalExpected.toFixed(0)}
            </div>
            <div className="col-span-2 flex items-center justify-center gap-1">
              <span className={`text-base font-bold ${getTotalColor()}`}>
                {totalActual.toFixed(0)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                totalDiff > 0.5 ? 'bg-success/20 text-success' : 
                totalDiff < -0.5 ? 'bg-error/20 text-error' : 
                'bg-accent/20 text-accent'
              }`}>
                {totalDiff >= 0 ? '+' : ''}{totalDiff.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Game History */}
        {gameHistory.length > 1 && (
          <div className="panel mb-6">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <History className="w-5 h-5 text-text-muted" />
              <h2 className="text-lg font-bold text-text-primary">Game History</h2>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-border">
              {gameHistory.slice(0, 10).map((entry, index) => (
                <div 
                  key={entry.id} 
                  className={`px-4 py-3 flex items-center gap-3 ${
                    index === 0 ? 'bg-accent/5' : ''
                  } ${
                    entry.isWin 
                      ? 'border-l-4 border-l-success' 
                      : 'border-l-4 border-l-error'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    entry.isWin ? 'bg-success/20' : 'bg-error/20'
                  }`}>
                    {entry.isWin ? (
                      <Trophy className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {entry.picks.length} picks • 
                      <span className={entry.isWin ? 'text-success' : 'text-error'}>
                        {entry.achievedTier ? ` HIT ${entry.achievedTier.label}!` : ' MISSED!'}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted">
                      {entry.actualPoints.toFixed(0)} pts (μ: {entry.lineupStats.muSmooth.toFixed(0)})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${entry.isWin ? 'text-success' : 'text-error'}`}>
                      {entry.isWin ? '+' : '-'}${entry.isWin ? entry.payout : entry.stake}
                    </p>
                    <p className="text-xs text-text-muted">${entry.balanceAfter.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Play Again Button */}
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </button>
      </div>
    </div>
  );
}
