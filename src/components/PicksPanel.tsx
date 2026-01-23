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
    return 'text-text-primary';
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

  // Calculate $20k marker position (40% of the bar since 20k is 40% of 50k)
  const minMarkerPos = (salaryMin / salaryMax) * 100;

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h2 className="text-lg font-bold text-text-primary">Your Picks</h2>
      </div>
      
      {/* Compact Stats Row with Horses | Conn */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-surface-elevated/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="text-text-muted">Picks</span>
            <span className="font-bold text-text-primary">{picks.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-text-muted">H|C</span>
            <span className="font-bold text-text-primary">
              {lineupStats.uniqueHorses}|{lineupStats.totalApps}
            </span>
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
      
      {/* Expected Points & Typical Range */}
      {picks.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="text-text-muted">Expected</span>
              <span className="ml-2 font-bold text-lg text-accent">{lineupStats.estimatedPoints}</span>
              <span className="ml-1 text-text-muted text-[10px]">pts</span>
            </div>
            <div className="text-xs text-right">
              <span className="text-text-muted">Typical Range</span>
              <span className="ml-2 font-semibold text-text-primary">
                {lineupStats.rangeFloor.toFixed(1)} → {lineupStats.rangeCeiling.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-text-muted">
            {lineupStats.fp1k.toFixed(1)} × ${(lineupStats.totalSalary / 1000).toFixed(1)}k = {lineupStats.estimatedPoints} pts
          </div>
        </div>
      )}
      
      {/* Salary Cap - Redesigned with $0 → $20k → $50k */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">Salary Cap</span>
          <span className={`text-lg font-bold ${getSalaryTextColor()}`}>
            ${lineupStats.totalSalary.toLocaleString()}
          </span>
        </div>
        
        {/* Progress bar with markers */}
        <div className="relative">
          <div className="h-3 bg-surface-hover rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getSalaryBarColor()}`}
              style={{ width: `${salaryProgress}%` }}
            />
          </div>
          
          {/* $20k marker line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-text-muted/50"
            style={{ left: `${minMarkerPos}%` }}
          />
        </div>
        
        {/* Labels: $0, $20k, $50k */}
        <div className="flex justify-between text-[10px] text-text-muted mt-1.5 relative">
          <span>$0</span>
          <span className="absolute" style={{ left: `${minMarkerPos}%`, transform: 'translateX(-50%)' }}>
            $20k
          </span>
          <span>$50k</span>
        </div>
        
        {/* Clear All Button */}
        {picks.length > 0 && (
          <button
            onClick={clearPicks}
            className="mt-3 w-full py-1.5 text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-300 dark:border-red-500/30 rounded-lg transition-all flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear All Picks
          </button>
        )}
      </div>
      
      {/* Picks List - Box Score Style with Columns */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {picks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-3">
            <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No picks yet</p>
            <p className="text-xs text-text-muted mt-1">Select connections from the panels</p>
          </div>
        ) : (
          <div className="text-[10px]">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_50px_30px_35px_35px_38px_40px_32px_32px_28px_28px] gap-0.5 px-2 py-1.5 bg-surface-elevated/50 border-b border-border text-text-muted uppercase font-semibold sticky top-0">
              <div></div>
              <div>Name</div>
              <div className="text-right">Sal</div>
              <div className="text-right">App</div>
              <div className="text-right">Odds</div>
              <div className="text-right">μ</div>
              <div className="text-right">FP1K</div>
              <div className="text-right">Rng</div>
              <div className="text-right">W%</div>
              <div className="text-right">ITM</div>
              <div className="text-right">#H</div>
              <div></div>
            </div>
            
            {/* Table Rows */}
            {picks.map((pick) => {
              const colors = roleColors[pick.connection.role];
              const winPct = pick.connection.startsYearly > 0 
                ? (pick.connection.winsYearly / pick.connection.startsYearly) * 100 
                : 0;
              const itmPct = pick.connection.startsYearly > 0
                ? ((pick.connection.winsYearly + pick.connection.placesYearly + pick.connection.showsYearly) / pick.connection.startsYearly) * 100
                : 0;
              const horseCount = pick.connection.horseIds?.length || 0;
              
              return (
                <div
                  key={pick.connection.id}
                  className="grid grid-cols-[auto_1fr_50px_30px_35px_35px_38px_40px_32px_32px_28px_28px] gap-0.5 px-2 py-2 items-center border-b border-border/50 hover:bg-surface-elevated/30 group"
                >
                  {/* Role Badge */}
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${colors.bg} text-white`}>
                    {roleLabels[pick.connection.role]}
                  </div>
                  
                  {/* Name */}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{pick.connection.name}</p>
                    <p className="text-[9px] text-text-muted truncate">
                      {pick.connection.startsYearly}-{pick.connection.winsYearly}-{pick.connection.placesYearly}-{pick.connection.showsYearly}
                    </p>
                  </div>
                  
                  {/* Salary */}
                  <div className="text-right font-semibold text-text-primary text-[10px]">
                    ${(pick.connection.salary / 1000).toFixed(1)}k
                  </div>
                  
                  {/* Apps */}
                  <div className="text-right text-text-secondary font-medium">
                    {pick.connection.apps.toString().padStart(2, '0')}
                  </div>
                  
                  {/* Odds */}
                  <div className="text-right text-text-primary font-medium">
                    {pick.connection.avgOdds ? pick.connection.avgOdds.toFixed(1) : '—'}
                  </div>
                  
                  {/* μ (Expected Points) */}
                  <div className="text-right text-text-primary font-medium">
                    {pick.connection.mu ? pick.connection.mu.toFixed(1) : '—'}
                  </div>
                  
                  {/* FP1K */}
                  <div className={`text-right font-semibold ${pick.connection.fp1k >= 10 ? 'text-emerald-500' : 'text-text-primary'}`}>
                    {pick.connection.fp1k > 0 ? pick.connection.fp1k.toFixed(1) : '—'}
                  </div>
                  
                  {/* Range */}
                  <div className="text-right text-text-muted text-[9px]">
                    {pick.connection.fp1kRange.low > 0 
                      ? `${pick.connection.fp1kRange.low.toFixed(0)}-${pick.connection.fp1kRange.high.toFixed(0)}`
                      : '—'
                    }
                  </div>
                  
                  {/* Win% */}
                  <div className="text-right text-text-primary font-medium">
                    {winPct > 0 ? winPct.toFixed(0) : '0'}
                  </div>
                  
                  {/* ITM% */}
                  <div className="text-right text-text-primary font-medium">
                    {itmPct > 0 ? itmPct.toFixed(0) : '0'}
                  </div>
                  
                  {/* Horse Count */}
                  <div className="text-right text-text-primary font-medium">
                    {horseCount}
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removePick(pick.connection.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-error/20 text-error transition-all flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
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
        
        {/* Play Button */}
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
