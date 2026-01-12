'use client';

import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { TargetProgressBar } from './TargetProgressBar';
import { Trophy, XCircle, ChevronDown, ChevronUp, TrendingUp, Wallet, History, CheckCircle, MinusCircle, Users } from 'lucide-react';
import { GameHistoryEntry } from '@/types';

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

interface HistoryEntryCardProps {
  entry: GameHistoryEntry;
  index: number;
}

function HistoryEntryCard({ entry, index }: HistoryEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Calculate totals
  const totalApps = entry.picks.reduce((sum, p) => sum + p.connection.apps, 0);
  const totalSalary = entry.picks.reduce((sum, p) => sum + p.connection.salary, 0);
  const totalExpected = entry.lineupStats.muSmooth;
  const totalActual = entry.actualPoints;
  const totalDiff = totalActual - totalExpected;
  
  // Calculate average odds
  const avgOdds = entry.picks.length > 0 
    ? entry.picks.reduce((sum, p) => sum + p.connection.avgOdds, 0) / entry.picks.length 
    : 0;
  
  // Determine total color
  const getTotalColor = () => {
    if (totalDiff > 0.5) return 'text-success';
    if (totalDiff < -0.5) return 'text-error';
    return 'text-accent';
  };
  
  return (
    <div className={`panel overflow-hidden ${
      index === 0 ? 'ring-2 ring-accent/30' : ''
    } ${
      entry.isWin 
        ? 'border-l-4 border-l-success' 
        : 'border-l-4 border-l-error'
    }`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          entry.isWin ? 'bg-success/20' : 'bg-error/20'
        }`}>
          {entry.isWin ? (
            <Trophy className="w-5 h-5 text-success" />
          ) : (
            <XCircle className="w-5 h-5 text-error" />
          )}
        </div>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary">
              {entry.picks.length} picks
            </span>
            <span className={`text-sm font-bold ${
              entry.isWin ? 'text-success' : 'text-error'
            }`}>
              {entry.achievedTier ? `HIT ${entry.achievedTier.label}!` : 'MISSED!'}
            </span>
          </div>
          <div className="text-xs text-text-muted">
            {formatDate(entry.timestamp)} • {entry.actualPoints.toFixed(0)} pts (μ: {entry.lineupStats.muSmooth.toFixed(0)})
          </div>
        </div>
        
        <div className="text-right mr-2">
          <div className={`text-lg font-bold ${entry.isWin ? 'text-success' : 'text-error'}`}>
            {entry.isWin ? '+' : '-'}${entry.isWin ? entry.payout : entry.stake}
          </div>
          <div className="text-xs text-text-muted">
            Balance: ${entry.balanceAfter.toLocaleString()}
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-muted" />
        )}
      </button>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Target Progress */}
          <div className="px-4 py-3 bg-surface-elevated/50">
            <TargetProgressBar
              targets={entry.targets}
              actualPoints={entry.actualPoints}
              showResults={true}
              isActive={true}
            />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 px-4 py-3 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-text-muted">μ (Expected)</p>
              <p className="text-sm font-bold text-text-primary">{entry.lineupStats.muSmooth.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">σ (Volatility)</p>
              <p className="text-sm font-bold text-text-secondary">{entry.lineupStats.sigmaSmooth.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Actual</p>
              <p className={`text-sm font-bold ${entry.isWin ? 'text-success' : 'text-error'}`}>
                {entry.actualPoints.toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Salary</p>
              <p className="text-sm font-bold text-text-primary">${entry.lineupStats.totalSalary.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Picks List - Enhanced with columns */}
          <div className="border-t border-border">
            {/* Column Headers */}
            <div className="px-4 py-2 bg-surface-elevated/30 grid grid-cols-12 gap-1 text-[10px] font-medium text-text-muted uppercase tracking-wider">
              <div className="col-span-4">Connection</div>
              <div className="col-span-1 text-center">Apps</div>
              <div className="col-span-2 text-center">Odds</div>
              <div className="col-span-2 text-center">Salary</div>
              <div className="col-span-1 text-center">Expected</div>
              <div className="col-span-2 text-center">Actual</div>
            </div>
            
            <div className="divide-y divide-border">
              {entry.picks.map((pick) => {
                const colors = roleColors[pick.connection.role];
                const expected = pick.connection.muSmooth || 0;
                const actual = pick.actualPoints ?? 0;
                const diff = actual - expected;
                const performanceColor = diff > 0.5 ? 'text-success' : diff < -0.5 ? 'text-error' : 'text-accent';
                const bgColor = diff > 0.5 ? 'bg-success/5' : diff < -0.5 ? 'bg-error/5' : '';
                
                return (
                  <div key={pick.connection.id} className={`px-4 py-2 grid grid-cols-12 gap-1 items-center ${bgColor}`}>
                    {/* Connection Name */}
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold ${colors.bg} text-white`}>
                        {roleLabels[pick.connection.role]}
                      </div>
                      <span className="text-sm font-medium text-text-primary truncate">
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
            <div className="px-4 py-2 bg-surface-elevated grid grid-cols-12 gap-1 items-center border-t-2 border-border">
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
        </div>
      )}
    </div>
  );
}

interface HistoryPageProps {
  onGoHome: () => void;
}

export function HistoryPage({ onGoHome }: HistoryPageProps) {
  const { gameHistory, bankroll, totalWins, totalLosses, totalWonAmount, totalLostAmount } = useGame();
  
  const netPL = totalWonAmount - totalLostAmount;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
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
              <p className={`text-lg font-bold ${netPL >= 0 ? 'text-success' : 'text-error'}`}>
                {netPL >= 0 ? '+' : ''}${netPL.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* History Header */}
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-text-muted" />
          <h2 className="text-lg font-bold text-text-primary">Game History</h2>
          <span className="text-sm text-text-muted">({gameHistory.length} games)</span>
        </div>
        
        {/* History List */}
        {gameHistory.length === 0 ? (
          <div className="panel p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No games played yet</h3>
            <p className="text-text-muted mb-4">Start playing to see your history here!</p>
            <button
              onClick={onGoHome}
              className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors"
            >
              Start Playing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {gameHistory.map((entry, index) => (
              <HistoryEntryCard key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
