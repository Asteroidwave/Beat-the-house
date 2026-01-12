'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TargetThreshold } from '@/types';

interface TargetSliderProps {
  target: TargetThreshold;
  index: number;
  isEnabled: boolean;
  onMultiplierChange: (index: number, newMultiplier: number) => void;
  onToggle: (index: number) => void;
  minMultiplier: number;
  maxMultiplier: number;
}

// Helper to get z-value from multiplier (interpolated from calibration data)
// Based on 80% EV curve from backtest
function getZFromMultiplier(multiplier: number): number {
  // Calibration points (multiplier -> z-value)
  const calibration = [
    { mult: 0.5, z: 3.15 },
    { mult: 1.0, z: 4.00 },
    { mult: 1.5, z: 4.70 },
    { mult: 2.0, z: 5.35 },
    { mult: 2.5, z: 5.70 },
    { mult: 3.0, z: 6.00 },
    { mult: 4.0, z: 6.80 },
    { mult: 5.0, z: 7.50 },
    { mult: 7.0, z: 8.50 },
    { mult: 10.0, z: 10.00 },
    { mult: 15.0, z: 11.90 },
  ];
  
  // Linear interpolation
  for (let i = 0; i < calibration.length - 1; i++) {
    if (multiplier >= calibration[i].mult && multiplier <= calibration[i + 1].mult) {
      const ratio = (multiplier - calibration[i].mult) / (calibration[i + 1].mult - calibration[i].mult);
      return calibration[i].z + ratio * (calibration[i + 1].z - calibration[i].z);
    }
  }
  
  // Extrapolate
  if (multiplier < calibration[0].mult) return calibration[0].z;
  return calibration[calibration.length - 1].z;
}

// Get color based on multiplier value
function getMultiplierColor(mult: number): string {
  if (mult <= 0.5) return '#94a3b8'; // slate
  if (mult <= 1.5) return '#22c55e'; // green
  if (mult <= 3) return '#3b82f6';   // blue
  if (mult <= 5) return '#a855f7';   // purple
  if (mult <= 10) return '#f59e0b';  // amber
  return '#ef4444';                  // red
}

function TargetSlider({
  target,
  index,
  isEnabled,
  onMultiplierChange,
  onToggle,
  minMultiplier,
  maxMultiplier,
}: TargetSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  
  const handleDoubleClick = () => {
    onToggle(index);
  };
  
  const snapPoints = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15];
  
  const snapToNearest = (value: number): number => {
    // Find closest snap point
    let closest = value;
    let minDist = Infinity;
    
    for (const snap of snapPoints) {
      const dist = Math.abs(value - snap);
      if (dist < 0.15 && dist < minDist) {
        minDist = dist;
        closest = snap;
      }
    }
    
    return closest;
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
    const logMin = Math.log(minMultiplier);
    const logMax = Math.log(maxMultiplier);
    const logValue = logMin + percent * (logMax - logMin);
    let rawValue = Math.exp(logValue);
    
    // Round to 1 decimal place
    rawValue = Math.round(rawValue * 10) / 10;
    
    // Snap to whole or half numbers
    const snappedValue = snapToNearest(rawValue);
    
    // Visual feedback for snapping
    if (snappedValue !== rawValue) {
      setIsSnapping(true);
      setTimeout(() => setIsSnapping(false), 100);
    }
    
    onMultiplierChange(index, Math.max(minMultiplier, Math.min(maxMultiplier, snappedValue)));
  }, [isDragging, index, onMultiplierChange, minMultiplier, maxMultiplier]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Calculate slider position (logarithmic scale)
  const logMin = Math.log(minMultiplier);
  const logMax = Math.log(maxMultiplier);
  const logValue = Math.log(target.multiplier);
  const position = ((logValue - logMin) / (logMax - logMin)) * 100;
  
  const color = getMultiplierColor(target.multiplier);
  
  return (
    <div 
      className={`relative py-2 transition-opacity ${!isEnabled ? 'opacity-40' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={isEnabled ? 'Double-click to disable' : 'Double-click to enable'}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ backgroundColor: color, color: 'white' }}
        >
          {target.multiplier}x
        </span>
        <span className="text-[10px] text-text-muted">
          Target: {target.targetPoints > 0 ? target.targetPoints.toFixed(0) : '—'} pts
        </span>
      </div>
      
      {/* Slider Track */}
      <div 
        ref={sliderRef}
        className={`relative h-2 bg-surface-hover rounded-full cursor-pointer ${
          isDragging ? 'cursor-grabbing' : isEnabled ? 'cursor-grab' : 'cursor-not-allowed'
        }`}
      >
        {/* Filled portion */}
        <div 
          className="absolute top-0 bottom-0 left-0 rounded-full transition-all"
          style={{ 
            width: `${position}%`,
            backgroundColor: isEnabled ? color : '#64748b',
          }}
        />
        
        {/* Slider handle */}
        <div
          className={`absolute top-1/2 w-4 h-4 rounded-full shadow-lg transition-all ${
            isDragging ? 'scale-125' : ''
          } ${isSnapping ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''}`}
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
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {target.multiplier}x
              <div 
                className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent"
                style={{ borderTopColor: color }}
              />
            </div>
          )}
        </div>
        
        {/* Snap point markers */}
        {snapPoints.map((snap) => {
          const snapLog = Math.log(snap);
          const snapPos = ((snapLog - logMin) / (logMax - logMin)) * 100;
          if (snapPos < 0 || snapPos > 100) return null;
          return (
            <div
              key={snap}
              className="absolute top-1/2 w-0.5 h-3 -translate-y-1/2 bg-text-muted/30 rounded-full"
              style={{ left: `${snapPos}%` }}
            />
          );
        })}
      </div>
      
      {/* Payout preview */}
      {isEnabled && target.payout > 0 && (
        <div className="text-right mt-0.5">
          <span className="text-[10px] text-success font-medium">${target.payout.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}

interface TargetSlidersProps {
  targets: TargetThreshold[];
  onTargetsChange: (newTargets: TargetThreshold[]) => void;
  stake: number;
  mu: number;
  sigma: number;
}

export function TargetSliders({ 
  targets, 
  onTargetsChange, 
  stake, 
  mu, 
  sigma 
}: TargetSlidersProps) {
  const [enabledIndices, setEnabledIndices] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  
  const handleMultiplierChange = (index: number, newMultiplier: number) => {
    const newTargets = targets.map((t, i) => {
      if (i !== index) return t;
      
      const newZ = getZFromMultiplier(newMultiplier);
      const newTargetPoints = mu + newZ * sigma;
      
      return {
        ...t,
        multiplier: newMultiplier,
        label: `${newMultiplier}x`,
        zValue: newZ,
        targetPoints: newTargetPoints,
        payout: stake * newMultiplier,
        color: getMultiplierColor(newMultiplier),
      };
    });
    
    onTargetsChange(newTargets);
  };
  
  const handleToggle = (index: number) => {
    setEnabledIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        // Don't allow disabling if it's the last one
        if (next.size <= 1) return prev;
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  
  // Count active targets
  const activeCount = enabledIndices.size;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">Target Multipliers</span>
        <span className="text-[10px] text-text-muted">
          {activeCount}/4 active • Double-click to toggle
        </span>
      </div>
      
      {targets.map((target, index) => (
        <TargetSlider
          key={index}
          target={target}
          index={index}
          isEnabled={enabledIndices.has(index)}
          onMultiplierChange={handleMultiplierChange}
          onToggle={handleToggle}
          minMultiplier={0.5}
          maxMultiplier={15}
        />
      ))}
      
      {/* EV indicator */}
      <div className="pt-2 border-t border-border mt-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-muted">Expected Return</span>
          <span className="font-medium text-accent">~80%</span>
        </div>
      </div>
    </div>
  );
}

export { getZFromMultiplier, getMultiplierColor };
