'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Settings2, Check, RotateCcw } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { computeDynamicZValues, getMultiplierColor, calculateExpectedReturn } from '@/lib/oddsStatistics';
import { TargetProgressBar } from './TargetProgressBar';

const MIN_GAP = 0.3;
const GLOBAL_MIN = 0.5;
const GLOBAL_MAX = 15;
const SNAP_POINTS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const SNAP_THRESHOLD = 0.12;

interface SliderProps {
  multiplier: number;
  index: number;
  isEnabled: boolean;
  minAllowed: number;
  maxAllowed: number;
  tailProb: number;
  exclusiveProb: number; // Probability of hitting EXACTLY this tier
  onMultiplierChange: (index: number, newMultiplier: number) => void;
  onToggle: (index: number) => void;
  canDisable: boolean;
}

function CompactSlider({
  multiplier,
  index,
  isEnabled,
  minAllowed,
  maxAllowed,
  tailProb,
  exclusiveProb,
  onMultiplierChange,
  onToggle,
  canDisable,
}: SliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  
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
    
    const logMin = Math.log(GLOBAL_MIN);
    const logMax = Math.log(GLOBAL_MAX);
    const logValue = logMin + percent * (logMax - logMin);
    let rawValue = Math.exp(logValue);
    
    rawValue = Math.max(minAllowed, Math.min(maxAllowed, rawValue));
    const { value: snappedValue, didSnap } = snapToNearest(rawValue);
    
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
  
  const logMin = Math.log(GLOBAL_MIN);
  const logMax = Math.log(GLOBAL_MAX);
  const logValue = Math.log(multiplier);
  const position = ((logValue - logMin) / (logMax - logMin)) * 100;
  
  const color = getMultiplierColor(multiplier);
  
  return (
    <div className={`flex items-center gap-4 py-3 ${!isEnabled ? 'opacity-40' : ''}`}>
      {/* Toggle Button */}
      <button
        onClick={() => (canDisable || !isEnabled) && onToggle(index)}
        disabled={!canDisable && isEnabled}
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          isEnabled 
            ? 'border-accent bg-accent' 
            : 'border-border bg-transparent hover:border-accent/50'
        } ${!canDisable && isEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        title={isEnabled ? (canDisable ? 'Click to disable' : 'At least one target required') : 'Click to enable'}
      >
        {isEnabled && <Check className="w-4 h-4 text-white" />}
      </button>
      
      {/* Multiplier Badge */}
      <span 
        className={`text-sm font-bold px-2.5 py-1 rounded min-w-[50px] text-center transition-transform flex-shrink-0 ${isSnapping ? 'scale-110' : ''}`}
        style={{ backgroundColor: isEnabled ? color : '#64748b', color: 'white' }}
      >
        {multiplier.toFixed(1)}x
      </span>
      
      {/* Slider Track */}
      <div 
        ref={sliderRef}
        className={`flex-1 relative h-3 bg-surface-hover rounded-full ${
          isDragging ? 'cursor-grabbing' : isEnabled ? 'cursor-grab' : 'cursor-not-allowed'
        }`}
      >
        <div 
          className="absolute top-0 bottom-0 left-0 rounded-full transition-all"
          style={{ 
            width: `${position}%`,
            backgroundColor: isEnabled ? color : '#64748b',
            opacity: 0.4,
          }}
        />
        
        <div
          className={`absolute top-1/2 w-5 h-5 rounded-full shadow-lg border-2 border-white transition-all ${
            isDragging ? 'scale-125' : ''
          } ${isSnapping ? 'ring-2 ring-white/50' : ''}`}
          style={{ 
            left: `${position}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: isEnabled ? color : '#64748b',
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
      
      {/* Hit Probability (exclusive - chance of hitting EXACTLY this tier) */}
      <div className="w-16 text-right flex-shrink-0">
        <span className="text-sm tabular-nums font-medium" style={{ color: isEnabled ? getMultiplierColor(multiplier) : '#64748b' }}>
          {isEnabled ? `${(exclusiveProb * 100).toFixed(0)}%` : '—'}
        </span>
      </div>
    </div>
  );
}

interface TargetCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TargetCustomizerModal({ isOpen, onClose }: TargetCustomizerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { 
    customMultipliers, 
    setCustomMultipliers,
    enabledTargetIndices,
    setEnabledTargetIndices,
    lineupStats,
    stake,
  } = useGame();
  
  // Local state for editing (apply on close)
  const [localMultipliers, setLocalMultipliers] = useState(customMultipliers);
  const [localEnabled, setLocalEnabled] = useState(enabledTargetIndices);
  
  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalMultipliers(customMultipliers);
      setLocalEnabled(enabledTargetIndices);
    }
  }, [isOpen, customMultipliers, enabledTargetIndices]);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);
  
  // Compute preview targets
  const activeMultipliers = localMultipliers.filter((_, i) => localEnabled.has(i));
  const zValuesData = computeDynamicZValues(activeMultipliers);
  
  // Calculate exclusive probabilities (chance of hitting EXACTLY this tier)
  // Sort by multiplier for proper calculation
  const sortedZData = [...zValuesData].sort((a, b) => a.multiplier - b.multiplier);
  const exclusiveProbsMap = new Map<number, number>();
  sortedZData.forEach((d, i) => {
    if (i === sortedZData.length - 1) {
      // Highest tier: exclusive prob = tail prob
      exclusiveProbsMap.set(d.multiplier, d.tailProb);
    } else {
      // Lower tiers: exclusive prob = tail prob - next tier's tail prob
      exclusiveProbsMap.set(d.multiplier, d.tailProb - sortedZData[i + 1].tailProb);
    }
  });
  
  const previewTargets = localMultipliers.map((mult, i) => {
    const isEnabled = localEnabled.has(i);
    if (!isEnabled) {
      return {
        multiplier: mult,
        label: `${mult}x`,
        color: getMultiplierColor(mult),
        zValue: 0,
        tailProb: 0,
        targetPoints: 0,
        payout: 0,
      };
    }
    const data = zValuesData.find(d => Math.abs(d.multiplier - mult) < 0.001);
    return {
      multiplier: mult,
      label: `${mult}x`,
      color: getMultiplierColor(mult),
      zValue: data?.zValue || 0,
      tailProb: data?.tailProb || 0,
      targetPoints: lineupStats.muSmooth + (data?.zValue || 0) * lineupStats.sigmaSmooth,
      payout: stake * mult,
    };
  }).filter((_, i) => localEnabled.has(i));
  
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
  
  // Build breakdown for display
  const mathBreakdown = sortedZData.map(d => {
    const excl = exclusiveProbsMap.get(d.multiplier) || 0;
    return {
      multiplier: d.multiplier,
      exclusiveProb: excl,
      contribution: d.multiplier * excl,
    };
  });
  
  const handleMultiplierChange = (index: number, newMultiplier: number) => {
    const newMultipliers = [...localMultipliers];
    newMultipliers[index] = newMultiplier;
    setLocalMultipliers(newMultipliers);
  };
  
  const handleToggle = (index: number) => {
    const newEnabled = new Set(localEnabled);
    if (newEnabled.has(index)) {
      if (newEnabled.size <= 1) return;
      newEnabled.delete(index);
    } else {
      newEnabled.add(index);
    }
    setLocalEnabled(newEnabled);
  };
  
  const getSliderBounds = (index: number): { min: number; max: number } => {
    const sortedIndices = [...Array(localMultipliers.length).keys()].sort(
      (a, b) => localMultipliers[a] - localMultipliers[b]
    );
    
    const currentPos = sortedIndices.indexOf(index);
    
    let minBound = GLOBAL_MIN;
    for (let i = currentPos - 1; i >= 0; i--) {
      const prevIndex = sortedIndices[i];
      if (localEnabled.has(prevIndex) || prevIndex === index) {
        if (prevIndex !== index) {
          minBound = localMultipliers[prevIndex] + MIN_GAP;
        }
        break;
      }
    }
    
    let maxBound = GLOBAL_MAX;
    for (let i = currentPos + 1; i < sortedIndices.length; i++) {
      const nextIndex = sortedIndices[i];
      if (localEnabled.has(nextIndex) || nextIndex === index) {
        if (nextIndex !== index) {
          maxBound = localMultipliers[nextIndex] - MIN_GAP;
        }
        break;
      }
    }
    
    return { min: Math.max(GLOBAL_MIN, minBound), max: Math.min(GLOBAL_MAX, maxBound) };
  };
  
  const sortedSliders = [...Array(localMultipliers.length).keys()]
    .map(index => ({
      index,
      multiplier: localMultipliers[index],
      isEnabled: localEnabled.has(index),
    }))
    .sort((a, b) => a.multiplier - b.multiplier);
  
  const handleApply = () => {
    setCustomMultipliers(localMultipliers);
    setEnabledTargetIndices(localEnabled);
    onClose();
  };
  
  const handleReset = () => {
    setLocalMultipliers([0.5, 2, 3, 5]);
    setLocalEnabled(new Set([0, 1, 2, 3]));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary text-lg">Customize Targets</h2>
              <p className="text-xs text-text-muted">Drag sliders or toggle tiers on/off</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Preview Progress Bar - Animated positions */}
        <div className="px-6 py-5 border-b border-border bg-surface-elevated/30">
          <p className="text-xs text-text-muted mb-3 uppercase tracking-wide font-medium">Live Preview</p>
          <TargetProgressBar
            targets={previewTargets}
            isActive={lineupStats.totalSalary >= 20000}
            animatePositions={true}
          />
        </div>
        
        {/* Sliders */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-text-secondary">
              Adjust multipliers between <span className="font-semibold">0.5x</span> and <span className="font-semibold">15x</span>
            </p>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
          
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-[10px] text-text-muted uppercase tracking-wider mb-2">
            <div className="col-span-1"></div>
            <div className="col-span-2">Tier</div>
            <div className="col-span-7">Adjust</div>
            <div className="col-span-2 text-right">Win %</div>
          </div>
          
          <div className="space-y-1 divide-y divide-border/50">
            {sortedSliders.map(({ index, multiplier, isEnabled }) => {
              const bounds = getSliderBounds(index);
              const data = zValuesData.find(d => Math.abs(d.multiplier - multiplier) < 0.001);
              const exclusiveProb = exclusiveProbsMap.get(multiplier) || 0;
              
              return (
                <CompactSlider
                  key={index}
                  multiplier={multiplier}
                  index={index}
                  isEnabled={isEnabled}
                  minAllowed={bounds.min}
                  maxAllowed={bounds.max}
                  tailProb={data?.tailProb || 0}
                  exclusiveProb={exclusiveProb}
                  onMultiplierChange={handleMultiplierChange}
                  onToggle={handleToggle}
                  canDisable={localEnabled.size > 1}
                />
              );
            })}
          </div>
        </div>
        
        {/* Expected Return with Math Breakdown */}
        <div className="px-6 py-4 border-t border-border bg-surface-elevated/30">
          {/* Math breakdown: multiplier × exclusive probability */}
          {mathBreakdown.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Expected Value Calculation</p>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {mathBreakdown.map((item, i) => (
                  <React.Fragment key={item.multiplier}>
                    <span 
                      className="font-mono px-1.5 py-0.5 rounded" 
                      style={{ backgroundColor: `${getMultiplierColor(item.multiplier)}20`, color: getMultiplierColor(item.multiplier) }}
                    >
                      {item.multiplier}x × {(item.exclusiveProb * 100).toFixed(0)}%
                    </span>
                    {i < mathBreakdown.length - 1 && <span className="text-text-muted">+</span>}
                  </React.Fragment>
                ))}
                <span className="text-text-muted">=</span>
                <span className="font-bold text-accent">{(expectedReturn * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Expected Return to Player</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-surface-hover rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${expectedReturn * 100}%` }}
                />
              </div>
              <span className="text-lg font-bold text-accent tabular-nums">
                {(expectedReturn * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-1">House edge: {((1 - expectedReturn) * 100).toFixed(0)}%</p>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-text-secondary hover:bg-surface-elevated transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
