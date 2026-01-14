'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { TargetProgressBar } from './TargetProgressBar';
import { TargetCustomizerModal } from './TargetCustomizerModal';
import { X, Zap, Users, Trash2, Settings2 } from 'lucide-react';

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
    canPlay,
    removePick,
    clearPicks,
    setStake,
    play,
  } = useGame();
  
  // Local state for stake input to allow empty field
  const [stakeInput, setStakeInput] = useState(stake.toString());
  
  // State for target customizer modal
  const [showCustomizer, setShowCustomizer] = useState(false);
  
  // Sync stakeInput when stake changes externally (e.g., game reset)
  useEffect(() => {
    setStakeInput(stake.toString());
  }, [stake]);

  const salaryProgress = Math.min((lineupStats.totalSalary / salaryMax) * 100, 100);
  const isAboveMin = lineupStats.totalSalary >= salaryMin;
  const isAtMax = lineupStats.totalSalary === salaryMax;
  const isInRange = lineupStats.totalSalary >= salaryMin && lineupStats.totalSalary < salaryMax;

  // Get salary bar color - green when at $20k+, purple at exactly $50k
  const getSalaryBarColor = () => {
    if (isAtMax) return 'bg-purple-500';
    if (isAboveMin) return 'bg-emerald-500';
    return 'bg-accent';
  };
  
  // Get salary text color
  const getSalaryTextColor = () => {
    if (isAtMax) return 'text-purple-500';
    if (isAboveMin) return 'text-emerald-500';
    return 'text-text-secondary';
  };
  
  // Handle stake input change
  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d*$/.test(value)) {
      setStakeInput(value);
      if (value !== '') {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
          setStake(Math.min(numValue, stakeMax));
        }
      }
    }
  };
  
  // Handle stake input blur - validate and set minimum if needed
  const handleStakeBlur = () => {
    const numValue = parseInt(stakeInput, 10);
    if (isNaN(numValue) || numValue < stakeMin) {
      setStake(stakeMin);
      setStakeInput(stakeMin.toString());
    } else if (numValue > stakeMax) {
      setStake(stakeMax);
      setStakeInput(stakeMax.toString());
    } else {
      setStake(numValue);
      setStakeInput(numValue.toString());
    }
  };

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h2 className="text-lg font-bold text-text-primary">Your Picks</h2>
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
            <span className="text-text-muted">Odds</span>
            <span className="font-bold text-text-primary">{lineupStats.avgOdds ? lineupStats.avgOdds.toFixed(1) : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-text-muted">FP1K</span>
            <span className={`font-bold ${lineupStats.fp1k >= 10 ? 'text-emerald-500' : lineupStats.fp1k >= 8 ? 'text-text-primary' : 'text-text-muted'}`}>
              {lineupStats.fp1k > 0 ? lineupStats.fp1k.toFixed(1) : '—'}
            </span>
          </div>
        </div>
      </div>
      
      {/* FP1K Calculator / Estimated Points */}
      {picks.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="text-text-muted">Est. Points</span>
              <span className="ml-2 font-bold text-lg text-accent">{lineupStats.estimatedPoints}</span>
            </div>
            <div className="text-xs text-right">
              <span className="text-text-muted">Range</span>
              <span className="ml-2 font-medium text-text-secondary">
                {lineupStats.rangeFloor} → {lineupStats.rangeCeiling}
              </span>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-text-muted">
            {lineupStats.fp1k.toFixed(1)} × ${(lineupStats.totalSalary / 1000).toFixed(1)}k = {lineupStats.estimatedPoints} pts
          </div>
        </div>
      )}
      
      {/* Salary Progress Bar */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-text-muted">Salary Cap</span>
          <span className={`font-semibold ${getSalaryTextColor()}`}>
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
        
        {/* Clear All Button - below salary cap */}
        {picks.length > 0 && (
          <button
            onClick={clearPicks}
            className="mt-2 w-full py-1.5 text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-300 dark:border-red-500/30 rounded-lg transition-all flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear All Picks
          </button>
        )}
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
                      ${pick.connection.salary.toLocaleString()} • {pick.connection.apps} apps • FP1K: {pick.connection.fp1k > 0 ? pick.connection.fp1k.toFixed(1) : '—'}
                    </p>
                  </div>
                  <div className="text-right mr-1">
                    <p className="text-[10px] text-text-muted">
                      {pick.connection.fp1kRange.low > 0 ? `${pick.connection.fp1kRange.low}→${pick.connection.fp1kRange.high}` : '—'}
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
        {/* Target Progress Bar with small customize button */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Targets</span>
            <button
              onClick={() => setShowCustomizer(true)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-muted hover:text-accent border border-border/50 hover:border-accent/50 rounded transition-all"
            >
              <Settings2 className="w-3 h-3" />
              Customize
            </button>
          </div>
          <TargetProgressBar
            targets={targets}
            isActive={isAboveMin}
            animatePositions={true}
          />
        </div>
        
        {/* Target Customizer Modal */}
        <TargetCustomizerModal
          isOpen={showCustomizer}
          onClose={() => setShowCustomizer(false)}
        />
        
        {/* Stake Input - Text field that allows clearing */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted whitespace-nowrap">Stake:</label>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={stakeInput}
                onChange={handleStakeChange}
                onBlur={handleStakeBlur}
                onFocus={(e) => e.target.select()}
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
