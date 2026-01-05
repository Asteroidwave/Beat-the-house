'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { TargetProgressBar } from './TargetProgressBar';
import { X, Zap, Users } from 'lucide-react';

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
  } = useGame();

  const salaryProgress = Math.min((lineupStats.totalSalary / salaryMax) * 100, 100);
  const isAboveMin = lineupStats.totalSalary >= salaryMin;
  const isAtMax = lineupStats.totalSalary === salaryMax;
  const isInRange = lineupStats.totalSalary >= salaryMin && lineupStats.totalSalary < salaryMax;

  // Get salary bar color
  const getSalaryBarColor = () => {
    if (isAtMax) return 'bg-purple-500';
    if (isInRange) return 'bg-success';
    return 'bg-accent';
  };

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h2 className="text-lg font-bold text-text-primary">Your Picks</h2>
      </div>
      
      {/* Compact Stats Row - No μ */}
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
        </div>
      </div>
      
      {/* Salary Progress Bar */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-text-muted">Salary Cap</span>
          <span className={`font-semibold ${isInRange || isAtMax ? 'text-success' : 'text-text-secondary'}`}>
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
            className={`h-full rounded-full transition-all duration-300 ${getSalaryBarColor()}`}
            style={{ width: `${salaryProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>${(salaryMin / 1000).toFixed(0)}k min</span>
          <span>${(salaryMax / 1000).toFixed(0)}k max</span>
        </div>
      </div>
      
      {/* Scrollable Picks List - Shows salary, apps, avg odds instead of μ/σ */}
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
                      ${pick.connection.salary.toLocaleString()} • {pick.connection.apps} apps • {pick.connection.avgOdds.toFixed(1)} odds
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
      
      {/* Bottom Section: Targets Progress Bar, Stake, Play */}
      <div className="flex-shrink-0 border-t border-border bg-surface">
        {/* Target Progress Bar - No label, no μ/σ display */}
        <div className="px-3 py-3 border-b border-border">
          <TargetProgressBar
            targets={targets}
            isActive={isAboveMin}
          />
        </div>
        
        {/* Stake Input - Box instead of slider */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted whitespace-nowrap">Stake:</label>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="number"
                value={stake}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0) {
                    setStake(Math.min(val, Math.min(stakeMax, lineupStats.totalSalary >= salaryMin ? 9999 : stakeMax)));
                  }
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  setStake(Math.max(stakeMin, Math.min(val, Math.min(stakeMax, lineupStats.totalSalary >= salaryMin ? 9999 : stakeMax))));
                }}
                min={stakeMin}
                max={stakeMax}
                disabled={!isAboveMin}
                placeholder="Enter amount"
                className="w-full pl-7 pr-3 py-2 text-sm font-medium text-text-primary bg-surface-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>Min: ${stakeMin}</span>
            <span>Max: ${stakeMax}</span>
          </div>
        </div>
        
        {/* Play Button - No Clear All Picks */}
        <div className="px-3 py-3">
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
              : stake > stakeMax
              ? `Max stake is $${stakeMax}`
              : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
