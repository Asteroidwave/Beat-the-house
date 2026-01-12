'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Settings2, Check } from 'lucide-react';
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
    <div className={`flex items-center gap-3 py-2 ${!isEnabled ? 'opacity-40' : ''}`}>
      {/* Toggle Button */}
      <button
        onClick={() => (canDisable || !isEnabled) && onToggle(index)}
        disabled={!canDisable && isEnabled}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isEnabled 
            ? 'border-accent bg-accent' 
            : 'border-border bg-transparent hover:border-accent/50'
        } ${!canDisable && isEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        title={isEnabled ? (canDisable ? 'Click to disable' : 'At least one target required') : 'Click to enable'}
      >
        {isEnabled && <Check className="w-3 h-3 text-white" />}
      </button>
      
      {/* Multiplier Badge */}
      <span 
        className={`text-xs font-bold px-2 py-0.5 rounded min-w-[40px] text-center transition-transform ${isSnapping ? 'scale-110' : ''}`}
        style={{ backgroundColor: isEnabled ? color : '#64748b', color: 'white' }}
      >
        {multiplier.toFixed(1)}x
      </span>
      
      {/* Slider Track */}
      <div 
        ref={sliderRef}
        className={`flex-1 relative h-2 bg-surface-hover rounded-full ${
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
          className={`absolute top-1/2 w-4 h-4 rounded-full shadow-lg border-2 border-white transition-all ${
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
      
      {/* Hit Probability */}
      <span className="text-[10px] text-text-muted w-12 text-right">
        {isEnabled ? `${(tailProb * 100).toFixed(0)}%` : '—'}
      </span>
    </div>
  );
}

interface TargetCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TargetCustomizerModal({ isOpen, onClose }: TargetCustomizerModalProps) {
  const { 
    customMultipliers, 
    setCustomMultipliers,
    enabledTargetIndices,
    setEnabledTargetIndices,
    lineupStats,
    stake,
    targets,
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
  
  // Compute preview targets
  const activeMultipliers = localMultipliers.filter((_, i) => localEnabled.has(i));
  const zValuesData = computeDynamicZValues(activeMultipliers);
  
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
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-accent" />
            <h2 className="font-bold text-text-primary">Customize Targets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Preview Progress Bar */}
        <div className="px-5 py-4 border-b border-border bg-surface-elevated/30">
          <p className="text-xs text-text-muted mb-2">Preview</p>
          <TargetProgressBar
            targets={previewTargets}
            isActive={lineupStats.totalSalary >= 20000}
          />
        </div>
        
        {/* Sliders */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-text-muted">Drag to adjust • Click checkbox to toggle</p>
            <button
              onClick={handleReset}
              className="text-xs text-accent hover:underline"
            >
              Reset to default
            </button>
          </div>
          
          <div className="space-y-1">
            {sortedSliders.map(({ index, multiplier, isEnabled }) => {
              const bounds = getSliderBounds(index);
              const data = zValuesData.find(d => Math.abs(d.multiplier - multiplier) < 0.001);
              
              return (
                <CompactSlider
                  key={index}
                  multiplier={multiplier}
                  index={index}
                  isEnabled={isEnabled}
                  minAllowed={bounds.min}
                  maxAllowed={bounds.max}
                  tailProb={data?.tailProb || 0}
                  onMultiplierChange={handleMultiplierChange}
                  onToggle={handleToggle}
                  canDisable={localEnabled.size > 1}
                />
              );
            })}
          </div>
        </div>
        
        {/* Expected Return */}
        <div className="px-5 py-3 border-t border-border bg-surface-elevated/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Expected Return</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${expectedReturn * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-accent">
                {(expectedReturn * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-elevated transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
