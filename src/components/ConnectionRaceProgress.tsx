'use client';

import React from 'react';
import { HorseEntry, Connection } from '@/types';

interface RaceResult {
  raceNumber: number;
  horseName: string;
  expectedPoints: number; // μ for this horse
  actualPoints: number;
  finish: number;
  odds: string;
  date: string;
}

interface ConnectionRaceProgressProps {
  connection: Connection;
  horses: HorseEntry[];
  showLabels?: boolean;
}

export function ConnectionRaceProgress({ 
  connection, 
  horses,
  showLabels = true 
}: ConnectionRaceProgressProps) {
  // Get all races for this connection
  const connectionHorses = horses.filter(h => {
    if (connection.role === 'jockey') return h.jockey === connection.name;
    if (connection.role === 'trainer') return h.trainer === connection.name;
    if (connection.role === 'sire') return h.sire1 === connection.name || h.sire2 === connection.name;
    return false;
  });
  
  // Build race results
  const raceResults: RaceResult[] = connectionHorses
    .filter(h => !h.isScratched && h.finish > 0)
    .map(h => ({
      raceNumber: h.race,
      horseName: h.horse,
      expectedPoints: h.muSmooth || 0,
      actualPoints: h.totalPoints || 0,
      finish: h.finish,
      odds: h.mlOdds,
      date: h.date,
    }))
    .sort((a, b) => a.raceNumber - b.raceNumber);
  
  if (raceResults.length === 0) {
    return (
      <div className="text-center text-text-muted text-xs py-2">
        No races available
      </div>
    );
  }
  
  // Calculate totals
  const totalExpected = raceResults.reduce((sum, r) => sum + r.expectedPoints, 0);
  const totalActual = raceResults.reduce((sum, r) => sum + r.actualPoints, 0);
  const totalDiff = totalActual - totalExpected;
  
  // Get the max value for scaling
  const maxValue = Math.max(
    ...raceResults.flatMap(r => [r.expectedPoints, r.actualPoints]),
    1
  );
  
  return (
    <div className="w-full">
      {/* Progress line with race nodes */}
      <div className="relative">
        {/* Horizontal line connecting nodes */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border -translate-y-1/2 z-0" />
        
        {/* Race nodes */}
        <div className="relative z-10 flex justify-between items-center px-2">
          {raceResults.map((race, index) => {
            const diff = race.actualPoints - race.expectedPoints;
            const performanceColor = diff > 0 ? 'text-success' : diff < 0 ? 'text-error' : 'text-accent';
            const bgColor = diff > 0 ? 'bg-success' : diff < 0 ? 'bg-error' : 'bg-accent';
            const borderColor = diff > 0 ? 'border-success' : diff < 0 ? 'border-error' : 'border-accent';
            
            // Finish position badge color
            const getFinishColor = () => {
              if (race.finish === 1) return 'bg-yellow-500';
              if (race.finish === 2) return 'bg-gray-400';
              if (race.finish === 3) return 'bg-amber-700';
              return 'bg-surface-elevated';
            };
            
            return (
              <div key={`${race.raceNumber}-${race.horseName}`} className="flex flex-col items-center">
                {/* Expected points (above) */}
                {showLabels && (
                  <div className="text-[9px] text-text-muted mb-1 font-medium">
                    μ:{race.expectedPoints.toFixed(0)}
                  </div>
                )}
                
                {/* Race node */}
                <div 
                  className={`relative w-8 h-8 rounded-full border-2 ${borderColor} ${bgColor}/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
                  title={`R${race.raceNumber}: ${race.horseName}\nOdds: ${race.odds}\nFinish: ${race.finish}\nExpected: ${race.expectedPoints.toFixed(1)} pts\nActual: ${race.actualPoints.toFixed(1)} pts`}
                >
                  {/* Finish position */}
                  <span className={`text-xs font-bold ${performanceColor}`}>
                    {race.finish}
                  </span>
                  
                  {/* Win/Place/Show badge */}
                  {race.finish <= 3 && (
                    <div 
                      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getFinishColor()} flex items-center justify-center`}
                    >
                      <span className="text-[7px] font-bold text-white">
                        {race.finish === 1 ? 'W' : race.finish === 2 ? 'P' : 'S'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Actual points (below) */}
                {showLabels && (
                  <div className={`text-[9px] mt-1 font-bold ${performanceColor}`}>
                    {race.actualPoints.toFixed(0)}
                  </div>
                )}
                
                {/* Race number */}
                <div className="text-[8px] text-text-muted mt-0.5">
                  R{race.raceNumber}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Summary */}
      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-text-muted">Expected: </span>
            <span className="font-medium text-text-secondary">{totalExpected.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-text-muted">Actual: </span>
            <span className={`font-bold ${totalDiff >= 0 ? 'text-success' : 'text-error'}`}>
              {totalActual.toFixed(1)}
            </span>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
          totalDiff >= 0 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
        }`}>
          {totalDiff >= 0 ? '+' : ''}{totalDiff.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

// Compact version for inline display
export function ConnectionRaceProgressCompact({ 
  connection, 
  horses 
}: ConnectionRaceProgressProps) {
  const connectionHorses = horses.filter(h => {
    if (connection.role === 'jockey') return h.jockey === connection.name;
    if (connection.role === 'trainer') return h.trainer === connection.name;
    if (connection.role === 'sire') return h.sire1 === connection.name || h.sire2 === connection.name;
    return false;
  });
  
  const raceResults = connectionHorses
    .filter(h => !h.isScratched && h.finish > 0)
    .map(h => ({
      expected: h.muSmooth || 0,
      actual: h.totalPoints || 0,
      finish: h.finish,
    }));
  
  if (raceResults.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1">
      {raceResults.map((r, i) => {
        const diff = r.actual - r.expected;
        const color = diff > 0 ? 'bg-success' : diff < 0 ? 'bg-error' : 'bg-accent';
        return (
          <div 
            key={i}
            className={`w-2 h-2 rounded-full ${color}`}
            title={`Exp: ${r.expected.toFixed(0)}, Act: ${r.actual.toFixed(0)}, Finish: ${r.finish}`}
          />
        );
      })}
    </div>
  );
}
