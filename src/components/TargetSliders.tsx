'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { computeDynamicZValues, getMultiplierColor, calculateExpectedReturn } from '@/lib/oddsStatistics';

// Minimum gap between adjacent sliders to prevent overlap
const MIN_GAP = 0.3;

// Slider boundaries
const GLOBAL_MIN = 0.5;
const GLOBAL_MAX = 15;

// Snap points for "sticky" feel at common values
const SNAP_POINTS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const SNAP_THRESHOLD = 0.12; // How close to snap

interface SliderProps {
  multiplier: number;
  index: number;
  isEnabled: boolean;
  minAllowed: number;  // Dynamic min based on previous slider
  maxAllowed: number;  // Dynamic max based on next slider
  targetPoints: number;
  tailProb: number;
  payout: number;
  onMultiplierChange: (index: number, newMultiplier: number) => void;
  onToggle: (index: number) => void;
  canDisable: boolean;
}

function TargetSlider({
  multiplier,
  index,
  isEnabled,
  minAllowed,
  maxAllowed,
  targetPoints,
  tailProb,
  payout,
  onMultiplierChange,
  onToggle,
  canDisable,
}: SliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  
  const handleDoubleClick = () => {
    if (canDisable || !isEnabled) {
      onToggle(index);
    }
  };
  
  const snapToNearest = (value: number): { value: number; didSnap: boolean } => {
    for (const snap of SNAP_POINTS) {
      if (snap >= minAllowed && snap <= maxAllowed) {
        const dist = Math.abs(value - snap);
        if (dist < SNAP_THRESHOLD) {
          return { value: snap, didSnap: true };
        }
      }
    }
    return { value: Math.round(value * 10) / 10, didSnap: false };
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEnabled) return;
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    
    // Map percent to multiplier range (logarithmic scale for better UX)
    const logMin = Math.log(GLOBAL_MIN);
    const logMax = Math.log(GLOBAL_MAX);
    const logValue = logMin + percent * (logMax - logMin);
    let rawValue = Math.exp(logValue);
    
    // Clamp to allowed range
    rawValue = Math.max(minAllowed, Math.min(maxAllowed, rawValue));
    
    // Snap to whole or half numbers
    const { value: snappedValue, didSnap } = snapToNearest(rawValue);
    
    // Visual feedback for snapping
    if (didSnap && !isSnapping) {
      setIsSnapping(true);
      setTimeout(() => setIsSnapping(false), 150);
    }
    
    onMultiplierChange(index, snappedValue);
  }, [isDragging, index, onMultiplierChange, minAllowed, maxAllowed, isSnapping]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      globalThis.window.addEventListener('mousemove', handleMouseMove);
      globalThis.window.addEventListener('mouseup', handleMouseUp);
      return () => {
        globalThis.window.removeEventListener('mousemove', handleMouseMove);
        globalThis.window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Calculate slider position (logarithmic scale)
  const logMin = Math.log(GLOBAL_MIN);
  const logMax = Math.log(GLOBAL_MAX);
  const logValue = Math.log(multiplier);
  const position = ((logValue - logMin) / (logMax - logMin)) * 100;
  
  // Calculate allowed range positions for visual indicator
  const minPos = ((Math.log(minAllowed) - logMin) / (logMax - logMin)) * 100;
  const maxPos = ((Math.log(maxAllowed) - logMin) / (logMax - logMin)) * 100;
  
  const color = getMultiplierColor(multiplier);
  
  return (
    <div 
      className={`relative py-2 transition-all ${!isEnabled ? 'opacity-40 grayscale' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={isEnabled ? (canDisable ? 'Double-click to disable' : 'Cannot disable - need at least 1 target') : 'Double-click to enable'}
    >
      {/* Label Row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span 
            className={`text-xs font-bold px-2 py-0.5 rounded transition-transform ${isSnapping ? 'scale-110' : ''}`}
            style={{ backgroundColor: color, color: 'white' }}
          >
            {multiplier.toFixed(1)}x
          </span>
          {isEnabled && (
            <span className="text-[10px] text-text-muted">
              {(tailProb * 100).toFixed(1)}% chance
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">
            {targetPoints > 0 ? `${targetPoints.toFixed(0)} pts` : '—'}
          </span>
          {isEnabled && payout > 0 && (
            <span className="text-[10px] text-success font-bold">${payout.toFixed(0)}</span>
          )}
        </div>
      </div>
      
      {/* Slider Track */}
      <div 
        ref={sliderRef}
        className={`relative h-3 bg-surface-hover rounded-full transition-all ${
          isDragging ? 'cursor-grabbing' : isEnabled ? 'cursor-grab' : 'cursor-not-allowed'
        } ${isSnapping ? 'ring-2 ring-accent/50' : ''}`}
      >
        {/* Allowed range indicator */}
        {isEnabled && (
          <div 
            className="absolute top-0 bottom-0 rounded-full opacity-20"
            style={{ 
              left: `${minPos}%`,
              width: `${maxPos - minPos}%`,
              backgroundColor: color,
            }}
          />
        )}
        
        {/* Filled portion from left to handle */}
        <div 
          className="absolute top-0 bottom-0 left-0 rounded-full transition-all"
          style={{ 
            width: `${position}%`,
            backgroundColor: isEnabled ? color : '#64748b',
            opacity: isEnabled ? 0.6 : 0.3,
          }}
        />
        
        {/* Snap point markers */}
        {SNAP_POINTS.map((snap) => {
          if (snap < minAllowed || snap > maxAllowed) return null;
          const snapLog = Math.log(snap);
          const snapPos = ((snapLog - logMin) / (logMax - logMin)) * 100;
          const isWhole = Number.isInteger(snap);
          return (
            <div
              key={snap}
              className={`absolute top-1/2 -translate-y-1/2 rounded-full ${
                isWhole ? 'w-1 h-4 bg-text-muted/40' : 'w-0.5 h-2 bg-text-muted/20'
              }`}
              style={{ left: `${snapPos}%` }}
            />
          );
        })}
        
        {/* Slider handle */}
        <div
          className={`absolute top-1/2 w-5 h-5 rounded-full shadow-lg border-2 border-white transition-all ${
            isDragging ? 'scale-125 shadow-xl' : ''
          } ${isSnapping ? 'scale-130 ring-4 ring-white/50' : ''}`}
          style={{ 
            left: `${position}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: isEnabled ? color : '#64748b',
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => !isDragging && setShowTooltip(false)}
        >
          {/* Tooltip */}
          {(showTooltip || isDragging) && isEnabled && (
            <div 
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap shadow-lg z-10"
              style={{ backgroundColor: color }}
            >
              {multiplier.toFixed(1)}x → ${payout.toFixed(0)}
              <div 
                className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent"
                style={{ borderTopColor: color }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Range labels */}
      <div className="flex justify-between mt-0.5 px-1">
        <span className="text-[9px] text-text-muted/50">{minAllowed.toFixed(1)}x</span>
        <span className="text-[9px] text-text-muted/50">{maxAllowed.toFixed(1)}x</span>
      </div>
    </div>
  );
}

export function TargetSliders() {
  const { 
    customMultipliers, 
    setCustomMultipliers,
    enabledTargetIndices,
    setEnabledTargetIndices,
    lineupStats,
    stake,
  } = useGame();
  
  // Compute z-values and probabilities for active multipliers
  const activeMultipliers = customMultipliers.filter((_, i) => enabledTargetIndices.has(i));
  const zValuesData = computeDynamicZValues(activeMultipliers);
  
  // Map z-value data back to all multipliers
  const getMultiplierData = (mult: number, isEnabled: boolean) => {
    if (!isEnabled) {
      return { zValue: 0, tailProb: 0, targetPoints: 0, payout: 0 };
    }
    const data = zValuesData.find(d => Math.abs(d.multiplier - mult) < 0.001);
    if (!data) {
      return { zValue: 0, tailProb: 0, targetPoints: 0, payout: 0 };
    }
    return {
      zValue: data.zValue,
      tailProb: data.tailProb,
      targetPoints: lineupStats.muSmooth + data.zValue * lineupStats.sigmaSmooth,
      payout: stake * mult,
    };
  };
  
  // Calculate expected return for display
  const expectedReturn = zValuesData.length > 0 ? calculateExpectedReturn(
    zValuesData.map(d => ({
      multiplier: d.multiplier,
      tailProb: d.tailProb,
      label: `${d.multiplier}x`,
      color: getMultiplierColor(d.multiplier),
      zValue: d.zValue,
      targetPoints: 0,
      payout: 0,
    }))
  ) : 0;
  
  const handleMultiplierChange = (index: number, newMultiplier: number) => {
    const newMultipliers = [...customMultipliers];
    newMultipliers[index] = newMultiplier;
    setCustomMultipliers(newMultipliers);
  };
  
  const handleToggle = (index: number) => {
    const newEnabled = new Set(enabledTargetIndices);
    if (newEnabled.has(index)) {
      // Don't allow disabling if it's the last one
      if (newEnabled.size <= 1) return;
      newEnabled.delete(index);
    } else {
      newEnabled.add(index);
    }
    setEnabledTargetIndices(newEnabled);
  };
  
  // Calculate dynamic min/max for each slider based on adjacent enabled sliders
  const getSliderBounds = (index: number): { min: number; max: number } => {
    const sortedIndices = [...Array(customMultipliers.length).keys()].sort(
      (a, b) => customMultipliers[a] - customMultipliers[b]
    );
    
    const currentPos = sortedIndices.indexOf(index);
    
    // Find previous enabled slider
    let minBound = GLOBAL_MIN;
    for (let i = currentPos - 1; i >= 0; i--) {
      const prevIndex = sortedIndices[i];
      if (enabledTargetIndices.has(prevIndex) || prevIndex === index) {
        if (prevIndex !== index) {
          minBound = customMultipliers[prevIndex] + MIN_GAP;
        }
        break;
      }
    }
    
    // Find next enabled slider
    let maxBound = GLOBAL_MAX;
    for (let i = currentPos + 1; i < sortedIndices.length; i++) {
      const nextIndex = sortedIndices[i];
      if (enabledTargetIndices.has(nextIndex) || nextIndex === index) {
        if (nextIndex !== index) {
          maxBound = customMultipliers[nextIndex] - MIN_GAP;
        }
        break;
      }
    }
    
    return { min: Math.max(GLOBAL_MIN, minBound), max: Math.min(GLOBAL_MAX, maxBound) };
  };
  
  // Sort sliders by multiplier value for display
  const sortedSliders = [...Array(customMultipliers.length).keys()]
    .map(index => ({
      index,
      multiplier: customMultipliers[index],
      isEnabled: enabledTargetIndices.has(index),
    }))
    .sort((a, b) => a.multiplier - b.multiplier);
  
  const activeCount = enabledTargetIndices.size;
  
  return (
    <div className="space-y-1 bg-surface rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-primary">Target Multipliers</span>
        <span className="text-[10px] text-text-muted bg-surface-hover px-2 py-0.5 rounded">
          {activeCount}/4 active
        </span>
      </div>
      
      <p className="text-[10px] text-text-muted mb-3">
        Drag sliders to customize. Double-click to toggle on/off.
      </p>
      
      {sortedSliders.map(({ index, multiplier, isEnabled }) => {
        const bounds = getSliderBounds(index);
        const data = getMultiplierData(multiplier, isEnabled);
        
        return (
          <TargetSlider
            key={index}
            multiplier={multiplier}
            index={index}
            isEnabled={isEnabled}
            minAllowed={bounds.min}
            maxAllowed={bounds.max}
            targetPoints={data.targetPoints}
            tailProb={data.tailProb}
            payout={data.payout}
            onMultiplierChange={handleMultiplierChange}
            onToggle={handleToggle}
            canDisable={activeCount > 1}
          />
        );
      })}
      
      {/* Expected Return Display */}
      <div className="pt-3 border-t border-border mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Expected Return</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${expectedReturn * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-accent">
              {(expectedReturn * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-[9px] text-text-muted mt-1">
          House edge: {((1 - expectedReturn) * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
