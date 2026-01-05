'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { TargetProgressBar } from './TargetProgressBar';
import { X, Zap, Users, DollarSign, Wallet, TrendingUp, Target } from 'lucide-react';

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

export function PicksPanel() {
  const {
    picks,
    lineupStats,
    targets,
    stake,
    salaryMin,
    salaryMax,
    stakeMin,
    stakeMax,
    isSalaryValid,
    canPlay,
    removePick,
    setStake,
    play,
    clearPicks,
    bankroll,
  } = useGame();

  const salaryProgress = Math.min((lineupStats.totalSalary / salaryMax) * 100, 100);
  const isAboveMin = lineupStats.totalSalary >= salaryMin;
  const isAtMax = lineupStats.totalSalary >= salaryMax;

  return (
    <div className="panel flex flex-col h-full">
      {/* Header with Bankroll */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Your Picks</h2>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded-lg">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-accent">${bankroll.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {/* Compact Stats Row */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-surface-elevated/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="text-text-muted">Picks</span>
            <span className="font-bold text-text-primary">{picks.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-text-muted">Apps</span>
            <span className="font-bold text-text-primary">{lineupStats.totalApps}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-text-muted">Avg Odds</span>
            <span className="font-bold text-text-primary">{lineupStats.avgOdds ? lineupStats.avgOdds.toFixed(1) : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-text-muted">μ</span>
            <span className="font-bold text-accent">{lineupStats.muSmooth ? lineupStats.muSmooth.toFixed(0) : '—'}</span>
          </div>
        </div>
      </div>
      
      {/* Salary Progress Bar */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-text-muted">Salary Cap</span>
          <span className={`font-semibold ${isAboveMin ? 'text-success' : 'text-text-secondary'}`}>
            ${lineupStats.totalSalary.toLocaleString()} / ${salaryMax.toLocaleString()}
          </span>
        </div>
        <div className="relative h-2 bg-surface-hover rounded-full overflow-hidden">
          {/* Min threshold marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-text-muted z-10"
            style={{ left: `${(salaryMin / salaryMax) * 100}%` }}
          />
          {/* Progress */}
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtMax ? 'bg-error' : isAboveMin ? 'bg-success' : 'bg-accent'
            }`}
            style={{ width: `${salaryProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>${(salaryMin / 1000).toFixed(0)}k min</span>
          <span>${(salaryMax / 1000).toFixed(0)}k max</span>
        </div>
      </div>
      
      {/* Scrollable Picks List */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
        {picks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No picks yet</p>
            <p className="text-xs text-text-muted mt-1">Select connections from the panels</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {picks.map((pick) => {
              const colors = roleColors[pick.connection.role];
              return (
                <div
                  key={pick.connection.id}
                  className="flex items-center gap-2 p-2 bg-surface-elevated rounded-lg group"
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${colors.bg} text-white`}>
                    {roleLabels[pick.connection.role]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{pick.connection.name}</p>
                    <p className="text-[10px] text-text-muted">
                      ${pick.connection.salary.toLocaleString()} • μ: {pick.connection.muSmooth.toFixed(1)} • σ: {pick.connection.sigmaSmooth.toFixed(1)}
                    </p>
                  </div>
                  <button
                    onClick={() => removePick(pick.connection.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-error/20 text-error transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Bottom Section: Targets, Stake, Play */}
      <div className="flex-shrink-0 border-t border-border bg-surface">
        {/* Dynamic Targets Progress Bar */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-text-primary">Target Thresholds</span>
            {lineupStats.stackedHorses > 0 && (
              <span className="text-[10px] text-amber-400 ml-auto">
                ⚠️ {lineupStats.stackedHorses} stacked
              </span>
            )}
          </div>
          <TargetProgressBar
            targets={targets}
            mu={lineupStats.muSmooth}
            sigma={lineupStats.sigmaSmooth}
            isActive={isAboveMin}
          />
        </div>
        
        {/* Stake Input */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Your Stake</span>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-accent" />
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Math.min(Math.max(Number(e.target.value), stakeMin), Math.min(stakeMax, bankroll)))}
                min={stakeMin}
                max={Math.min(stakeMax, bankroll)}
                disabled={!isAboveMin}
                className="w-16 text-right text-sm font-bold text-text-primary bg-transparent border-none focus:outline-none disabled:text-text-muted"
              />
            </div>
          </div>
          <input
            type="range"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            min={stakeMin}
            max={Math.min(stakeMax, bankroll)}
            disabled={!isAboveMin}
            className="w-full h-1.5 bg-surface-hover rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-accent"
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>${stakeMin}</span>
            <span>${Math.min(stakeMax, bankroll)}</span>
          </div>
        </div>
        
        {/* Play Button */}
        <div className="px-3 py-3">
          {/* Quick payout preview */}
          {isAboveMin && targets.length > 0 && (
            <div className="flex items-center justify-center gap-3 mb-2 text-[10px]">
              {targets.map(t => (
                <div key={t.label} className="flex items-center gap-1">
                  <span style={{ color: t.color }} className="font-bold">{t.label}:</span>
                  <span className="text-success">${t.payout}</span>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={play}
            disabled={!canPlay}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              canPlay
                ? 'bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white shadow-lg'
                : 'bg-surface-elevated text-text-muted cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4" />
            {!isAboveMin
              ? `Add $${(salaryMin - lineupStats.totalSalary).toLocaleString()} more`
              : stake > bankroll
              ? 'Insufficient Balance'
              : lineupStats.mu === 0
              ? 'Select more picks'
              : 'Play'}
          </button>
          
          {picks.length > 0 && (
            <button
              onClick={clearPicks}
              className="w-full mt-2 py-2 text-xs text-text-muted hover:text-error transition-colors"
            >
              Clear All Picks
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
