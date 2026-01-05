'use client';

import React from 'react';
import { TargetThreshold } from '@/types';

interface TargetProgressBarProps {
  targets: TargetThreshold[];
  mu: number;
  sigma: number;
  actualPoints?: number;  // Only shown in results
  showResults?: boolean;
  isActive: boolean;  // Whether lineup meets salary requirements
}

export function TargetProgressBar({ 
  targets, 
  mu, 
  sigma, 
  actualPoints,
  showResults = false,
  isActive 
}: TargetProgressBarProps) {
  // Calculate the range for visualization
  // Show from 0.5x target (lowest) to slightly beyond 5x target (highest)
  const sortedTargets = [...targets].sort((a, b) => a.targetPoints - b.targetPoints);
  const minTarget = sortedTargets[0]?.targetPoints || 0;
  const maxTarget = sortedTargets[sortedTargets.length - 1]?.targetPoints || 100;
  
  // Add padding to the range
  const rangeStart = Math.max(0, minTarget - sigma * 0.5);
  const rangeEnd = maxTarget + sigma * 0.5;
  const totalRange = rangeEnd - rangeStart;

  // Calculate position percentage for a given value
  const getPosition = (value: number) => {
    if (totalRange === 0) return 0;
    return Math.max(0, Math.min(100, ((value - rangeStart) / totalRange) * 100));
  };

  // Determine which tier was achieved (for results)
  const achievedTierIndex = showResults && actualPoints !== undefined
    ? sortedTargets.filter(t => actualPoints >= t.targetPoints).length
    : -1;

  return (
    <div className={`space-y-3 ${!isActive ? 'opacity-50' : ''}`}>
      {/* Target Labels Row */}
      <div className="relative h-16">
        {sortedTargets.map((target, index) => {
          const position = getPosition(target.targetPoints);
          const isAchieved = showResults && achievedTierIndex > index;
          const isCurrentTier = showResults && achievedTierIndex === index + 1;
          
          return (
            <div
              key={target.label}
              className="absolute flex flex-col items-center transform -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              {/* Points needed */}
              <span 
                className={`text-[10px] font-semibold mb-0.5 transition-all ${
                  isCurrentTier 
                    ? 'text-white scale-110' 
                    : isAchieved 
                    ? 'text-text-muted line-through' 
                    : 'text-text-secondary'
                }`}
              >
                {target.targetPoints.toFixed(0)} pts
              </span>
              
              {/* Multiplier badge */}
              <div 
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  isCurrentTier
                    ? 'ring-2 ring-white scale-110 shadow-lg'
                    : isAchieved
                    ? 'opacity-60'
                    : ''
                }`}
                style={{ 
                  backgroundColor: target.color,
                  color: 'white',
                  boxShadow: isCurrentTier ? `0 0 20px ${target.color}` : undefined,
                }}
              >
                {target.label}
              </div>
              
              {/* Payout amount */}
              <span 
                className={`text-[10px] font-semibold mt-0.5 transition-all ${
                  isCurrentTier 
                    ? 'text-success scale-110' 
                    : isAchieved 
                    ? 'text-text-muted line-through' 
                    : 'text-text-secondary'
                }`}
              >
                ${target.payout.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-surface-hover rounded-full overflow-hidden">
        {/* Target markers on the bar */}
        {sortedTargets.map((target, index) => {
          const position = getPosition(target.targetPoints);
          const isAchieved = showResults && actualPoints !== undefined && actualPoints >= target.targetPoints;
          
          return (
            <div
              key={target.label}
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{ 
                left: `${position}%`,
                backgroundColor: target.color,
                opacity: isAchieved ? 1 : 0.5,
              }}
            />
          );
        })}
        
        {/* Mean (μ) marker */}
        {mu > 0 && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-white/50 z-5"
            style={{ left: `${getPosition(mu)}%` }}
            title={`Expected: ${mu.toFixed(1)} pts`}
          />
        )}
        
        {/* Actual points progress (only in results) */}
        {showResults && actualPoints !== undefined && (
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              achievedTierIndex > 0 ? 'animate-pulse' : ''
            }`}
            style={{ 
              width: `${getPosition(actualPoints)}%`,
              background: achievedTierIndex > 0 
                ? `linear-gradient(90deg, ${sortedTargets[0]?.color}, ${sortedTargets[Math.min(achievedTierIndex - 1, sortedTargets.length - 1)]?.color})`
                : 'linear-gradient(90deg, #ef4444, #dc2626)',
            }}
          />
        )}
        
        {/* Loading/preview gradient when not in results */}
        {!showResults && isActive && (
          <div 
            className="h-full opacity-30 animate-pulse"
            style={{ 
              width: `${getPosition(mu)}%`,
              background: 'linear-gradient(90deg, #94a3b8, #22c55e)',
            }}
          />
        )}
      </div>

      {/* Actual points indicator (results only) */}
      {showResults && actualPoints !== undefined && (
        <div 
          className="relative h-6"
          style={{ marginTop: '-0.5rem' }}
        >
          <div
            className="absolute flex flex-col items-center transform -translate-x-1/2"
            style={{ left: `${getPosition(actualPoints)}%` }}
          >
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white" />
            <div className={`px-2 py-0.5 rounded text-xs font-bold ${
              achievedTierIndex > 0 ? 'bg-success text-white' : 'bg-error text-white'
            }`}>
              {actualPoints.toFixed(1)} pts
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
        <div className="flex items-center gap-2">
          <span>μ = {mu.toFixed(1)}</span>
          <span>σ = {sigma.toFixed(1)}</span>
        </div>
        {showResults && actualPoints !== undefined && (
          <span className={achievedTierIndex > 0 ? 'text-success font-bold' : 'text-error'}>
            {achievedTierIndex > 0 
              ? `HIT ${sortedTargets[achievedTierIndex - 1]?.label}!` 
              : 'MISSED'}
          </span>
        )}
      </div>
    </div>
  );
}

