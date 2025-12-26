'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { calculateActualPoints } from '@/lib/parseExcel';
import { Trophy, XCircle, RotateCcw, TrendingUp, Target, DollarSign, Wallet, History, CheckCircle, MinusCircle } from 'lucide-react';

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

export function ResultsView() {
  const { gameResult, horses, resetGame, bankroll, gameHistory, totalWins, totalLosses, totalWonAmount, totalLostAmount } = useGame();

  if (!gameResult) return null;

  const pickedConnections = gameResult.picks.map((p) => p.connection);
  const actualPointsMap = calculateActualPoints(pickedConnections, horses);
  
  const percentAchieved = (gameResult.actualPoints / gameResult.expectedPoints) * 100;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Main Result Card */}
        <div className={`rounded-2xl p-6 mb-6 ${
          gameResult.isWin 
            ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/30' 
            : 'bg-gradient-to-br from-error/20 to-error/5 border border-error/30'
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
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-text-muted mb-1">Expected</p>
              <p className="text-2xl font-bold text-text-primary">{gameResult.expectedPoints.toFixed(1)}</p>
              <p className="text-xs text-text-muted">points</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Actual</p>
              <p className={`text-2xl font-bold ${gameResult.isWin ? 'text-success' : 'text-error'}`}>
                {gameResult.actualPoints.toFixed(1)}
              </p>
              <p className="text-xs text-text-muted">{percentAchieved.toFixed(0)}% of target</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">
                {gameResult.isWin ? 'Payout' : 'Lost'}
              </p>
              <p className={`text-2xl font-bold ${gameResult.isWin ? 'text-success' : 'text-error'}`}>
                ${gameResult.isWin ? gameResult.payout.toLocaleString() : gameResult.stake.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted">{gameResult.selectedMultiplier.label} multiplier</p>
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
        
        {/* Picks Breakdown */}
        <div className="panel mb-6">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Your Picks Performance</h2>
          </div>
          <div className="divide-y divide-border">
            {gameResult.picks.map((pick) => {
              const actual = actualPointsMap.get(pick.connection.id) || 0;
              const expected = pick.connection.avpa90d * pick.connection.apps;
              const beat = actual >= expected;
              const colors = roleColors[pick.connection.role];
              
              return (
                <div key={pick.connection.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${colors.bg} text-white`}>
                    {roleLabels[pick.connection.role]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{pick.connection.name}</p>
                    <p className="text-xs text-text-muted">{pick.connection.apps} apps</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Expected:</span>
                      <span className="text-sm font-medium text-text-secondary">{expected.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Actual:</span>
                      <span className={`text-sm font-bold ${beat ? 'text-success' : 'text-error'}`}>
                        {actual.toFixed(1)}
                      </span>
                      {beat ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <MinusCircle className="w-4 h-4 text-error" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                <div key={entry.id} className={`px-4 py-3 flex items-center gap-3 ${index === 0 ? 'bg-accent/5' : ''}`}>
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
                      {entry.picks.length} picks • {entry.multiplier.label}
                    </p>
                    <p className="text-xs text-text-muted">
                      {entry.actualPoints.toFixed(0)} / {entry.targetPoints.toFixed(0)} pts
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
          onClick={resetGame}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </button>
      </div>
    </div>
  );
}
