'use client';

import React from 'react';
import { TargetThreshold } from '@/types';

interface TargetProgressBarProps {
  targets: TargetThreshold[];
  actualPoints?: number;  // Only shown in results
  showResults?: boolean;
  isActive: boolean;  // Whether lineup meets salary requirements
}

export function TargetProgressBar({ 
  targets, 
  actualPoints,
  showResults = false,
  isActive 
}: TargetProgressBarProps) {
  // Fixed positions for each multiplier tier (evenly spaced)
  const tierPositions = [15, 40, 65, 90]; // percentage positions
  
  // Sort targets by multiplier
  const sortedTargets = [...targets].sort((a, b) => a.multiplier - b.multiplier);

  // Determine which tier was achieved (for results)
  const achievedTierIndex = showResults && actualPoints !== undefined
    ? sortedTargets.filter(t => actualPoints >= t.targetPoints).length
    : -1;

  // Calculate actual points position for results
  const getActualPosition = () => {
    if (!showResults || actualPoints === undefined || sortedTargets.length === 0) return 0;
    
    const minTarget = sortedTargets[0]?.targetPoints || 0;
    const maxTarget = sortedTargets[sortedTargets.length - 1]?.targetPoints || 100;
    const rangeStart = Math.max(0, minTarget * 0.7);
    const rangeEnd = maxTarget * 1.2;
    const totalRange = rangeEnd - rangeStart;
    
    if (totalRange === 0) return 0;
    return Math.max(0, Math.min(100, ((actualPoints - rangeStart) / totalRange) * 100));
  };

  return (
    <div className={`space-y-1 ${!isActive ? 'opacity-40' : ''}`}>
      {/* Points needed (TOP) */}
      <div className="relative h-5">
        {sortedTargets.map((target, index) => {
          const position = tierPositions[index];
          const isAchieved = showResults && achievedTierIndex > index;
          
          return (
            <div
              key={`points-${target.label}`}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <span 
                className={`text-[10px] font-semibold ${
                  isAchieved ? 'text-text-muted line-through' : 'text-text-secondary'
                }`}
              >
                {target.targetPoints > 0 ? `${target.targetPoints.toFixed(0)} pts` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar with Multipliers INSIDE */}
      <div className="relative h-8 bg-surface-hover rounded-full overflow-hidden">
        {/* Multiplier badges inside the bar */}
        {sortedTargets.map((target, index) => {
          const position = tierPositions[index];
          const isAchieved = showResults && achievedTierIndex > index;
          const isCurrentTier = showResults && achievedTierIndex === index + 1;
          
          return (
            <div
              key={`badge-${target.label}`}
              className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ left: `${position}%` }}
            >
              <div 
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  isCurrentTier ? 'ring-2 ring-white scale-110' : ''
                } ${isAchieved ? 'opacity-60' : ''}`}
                style={{ 
                  backgroundColor: target.color,
                  color: 'white',
                  boxShadow: isCurrentTier ? `0 0 12px ${target.color}` : undefined,
                }}
              >
                {target.label}
              </div>
            </div>
          );
        })}
        
        {/* Vertical markers at each threshold */}
        {sortedTargets.map((target, index) => {
          const position = tierPositions[index];
          return (
            <div
              key={`marker-${target.label}`}
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{ 
                left: `${position}%`,
                backgroundColor: target.color,
                opacity: 0.6,
              }}
            />
          );
        })}
        
        {/* Actual points progress (only in results) */}
        {showResults && actualPoints !== undefined && (
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-1000 ease-out z-5"
            style={{ 
              width: `${getActualPosition()}%`,
              background: achievedTierIndex > 0 
                ? `linear-gradient(90deg, ${sortedTargets[0]?.color}80, ${sortedTargets[Math.min(achievedTierIndex - 1, sortedTargets.length - 1)]?.color})`
                : 'linear-gradient(90deg, #ef444480, #dc262680)',
            }}
          />
        )}
      </div>

      {/* Payout amounts (BOTTOM) */}
      <div className="relative h-5">
        {sortedTargets.map((target, index) => {
          const position = tierPositions[index];
          const isAchieved = showResults && achievedTierIndex > index;
          const isCurrentTier = showResults && achievedTierIndex === index + 1;
          
          return (
            <div
              key={`payout-${target.label}`}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <span 
                className={`text-[10px] font-semibold ${
                  isCurrentTier 
                    ? 'text-success' 
                    : isAchieved 
                    ? 'text-text-muted line-through' 
                    : 'text-success'
                }`}
              >
                ${target.payout > 0 ? target.payout.toFixed(0) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actual points indicator (results only) */}
      {showResults && actualPoints !== undefined && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className={`text-sm font-bold ${achievedTierIndex > 0 ? 'text-success' : 'text-error'}`}>
            Actual: {actualPoints.toFixed(1)} pts
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            achievedTierIndex > 0 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
          }`}>
            {achievedTierIndex > 0 
              ? `HIT ${sortedTargets[achievedTierIndex - 1]?.label}!` 
              : 'MISSED'}
          </span>
        </div>
      )}
    </div>
  );
}
