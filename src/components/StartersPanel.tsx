'use client';

import React, { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { HorseEntry } from '@/types';

// Program number (saddlecloth) colors
const getProgramNumberBadge = (programNumber?: number | null) => {
  if (!programNumber || programNumber < 1) {
    return { bg: 'bg-gray-400', text: 'text-white', number: null };
  }
  
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: 'bg-[#DC2626]', text: 'text-white' },
    2: { bg: 'bg-[#E0F7FF]', text: 'text-black' },
    3: { bg: 'bg-[#005CE8]', text: 'text-white' },
    4: { bg: 'bg-[#ECC94B]', text: 'text-black' },
    5: { bg: 'bg-[#16A34A]', text: 'text-white' },
    6: { bg: 'bg-[#800080]', text: 'text-white' },
    7: { bg: 'bg-[#F97316]', text: 'text-black' },
    8: { bg: 'bg-[#F9A8D4]', text: 'text-black' },
    9: { bg: 'bg-[#99F6E4]', text: 'text-black' },
    10: { bg: 'bg-[#800080]', text: 'text-white' },
    11: { bg: 'bg-[#000080]', text: 'text-white' },
    12: { bg: 'bg-[#36CD30]', text: 'text-black' },
  };
  
  if (programNumber <= 12 && colors[programNumber]) {
    return { ...colors[programNumber], number: programNumber };
  }
  
  const colorArray = Object.values(colors);
  const index = (programNumber - 1) % colorArray.length;
  return { ...colorArray[index], number: programNumber };
};

const ROLE_COLORS = {
  jockey: { bg: 'bg-blue-500', bgLight: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500' },
  trainer: { bg: 'bg-green-500', bgLight: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
  sire: { bg: 'bg-amber-500', bgLight: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500' },
};

export function StartersPanel() {
  const { races, horses, isLoading, connections, addPick, isConnectionPicked } = useGame();
  
  // Group horses by race
  const raceGroups = useMemo(() => {
    const groups: Map<number, HorseEntry[]> = new Map();
    
    horses.forEach(horse => {
      if (!groups.has(horse.race)) {
        groups.set(horse.race, []);
      }
      groups.get(horse.race)!.push(horse);
    });
    
    // Sort each race by PP
    groups.forEach((entries, race) => {
      entries.sort((a, b) => a.pp - b.pp);
    });
    
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [horses]);

  const handleConnectionClick = (name: string, role: 'jockey' | 'trainer' | 'sire') => {
    const connection = connections.find(c => c.name === name && c.role === role);
    if (connection && !isConnectionPicked(connection.id)) {
      addPick(connection);
    }
  };

  if (isLoading) {
    return (
      <div className="panel flex items-center justify-center h-full">
        <div className="text-text-secondary">Loading starters...</div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-bold text-text-primary">Starters</h2>
        <p className="text-xs text-text-muted">December 12, 2024 • Aqueduct</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {raceGroups.map(([raceNum, entries]) => (
          <div key={raceNum} className="border-b border-border last:border-b-0">
            {/* Race Header */}
            <div className="bg-surface-elevated px-4 py-2 text-xs font-medium text-text-secondary border-b border-border">
              December 12, 2024 • Aqueduct • Race {raceNum}
            </div>
            
            {/* Horse Entries */}
            {entries.map((horse, idx) => {
              const isScratched = horse.isScratched || horse.horse.includes('SCR');
              const badgeStyle = getProgramNumberBadge(horse.pp);
              
              const jockeyPicked = connections.find(c => c.name === horse.jockey && c.role === 'jockey')
                ? isConnectionPicked(connections.find(c => c.name === horse.jockey && c.role === 'jockey')!.id)
                : false;
              const trainerPicked = connections.find(c => c.name === horse.trainer && c.role === 'trainer')
                ? isConnectionPicked(connections.find(c => c.name === horse.trainer && c.role === 'trainer')!.id)
                : false;
              const sire1Picked = horse.sire1 && connections.find(c => c.name === horse.sire1 && c.role === 'sire')
                ? isConnectionPicked(connections.find(c => c.name === horse.sire1 && c.role === 'sire')!.id)
                : false;
              const sire2Picked = horse.sire2 && connections.find(c => c.name === horse.sire2 && c.role === 'sire')
                ? isConnectionPicked(connections.find(c => c.name === horse.sire2 && c.role === 'sire')!.id)
                : false;
              
              return (
                <div
                  key={`${horse.race}-${horse.horse}-${idx}`}
                  className={`flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-b-0 ${
                    isScratched ? 'opacity-40' : ''
                  }`}
                >
                  {/* Left: PP + Odds + Horse */}
                  <div className="w-[140px] shrink-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${badgeStyle.bg} ${badgeStyle.text}`}>
                        {horse.pp}
                      </div>
                      <span className="text-xs text-text-secondary">{horse.mlOdds}</span>
                    </div>
                    <div className={`text-sm font-semibold truncate ${isScratched ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {horse.horse.replace('SCR', '').replace('(SCR)', '').trim()}
                      {isScratched && <span className="ml-1 text-xs text-error">(SCR)</span>}
                    </div>
                  </div>
                  
                  {/* Right: Connections in 2x2 grid */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Row 1: Jockey & Trainer */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => !isScratched && handleConnectionClick(horse.jockey, 'jockey')}
                        disabled={isScratched || jockeyPicked}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          jockeyPicked
                            ? 'bg-blue-500 text-white'
                            : isScratched
                            ? 'bg-surface cursor-not-allowed'
                            : 'bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                          jockeyPicked ? 'bg-white text-blue-500' : 'bg-blue-500 text-white'
                        }`}>J</span>
                        <span className={`truncate font-medium ${jockeyPicked ? 'text-white' : 'text-text-primary'}`}>{horse.jockey}</span>
                      </button>
                      
                      <button
                        onClick={() => !isScratched && handleConnectionClick(horse.trainer, 'trainer')}
                        disabled={isScratched || trainerPicked}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          trainerPicked
                            ? 'bg-green-500 text-white'
                            : isScratched
                            ? 'bg-surface cursor-not-allowed'
                            : 'bg-green-500/10 hover:bg-green-500/20 cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                          trainerPicked ? 'bg-white text-green-500' : 'bg-green-500 text-white'
                        }`}>T</span>
                        <span className={`truncate font-medium ${trainerPicked ? 'text-white' : 'text-text-primary'}`}>{horse.trainer}</span>
                      </button>
                    </div>
                    
                    {/* Row 2: Sire 1 & Sire 2 */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => !isScratched && horse.sire1 && handleConnectionClick(horse.sire1, 'sire')}
                        disabled={isScratched || sire1Picked || !horse.sire1}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          sire1Picked
                            ? 'bg-amber-500 text-white'
                            : isScratched || !horse.sire1
                            ? 'bg-surface cursor-not-allowed'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                          sire1Picked ? 'bg-white text-amber-500' : 'bg-amber-500 text-white'
                        }`}>S</span>
                        <span className={`truncate font-medium ${sire1Picked ? 'text-white' : 'text-text-primary'}`}>{horse.sire1 || '—'}</span>
                      </button>
                      
                      <button
                        onClick={() => !isScratched && horse.sire2 && handleConnectionClick(horse.sire2, 'sire')}
                        disabled={isScratched || sire2Picked || !horse.sire2}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          sire2Picked
                            ? 'bg-amber-500 text-white'
                            : isScratched || !horse.sire2
                            ? 'bg-surface cursor-not-allowed'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                          sire2Picked ? 'bg-white text-amber-500' : 'bg-amber-500 text-white'
                        }`}>S</span>
                        <span className={`truncate font-medium ${sire2Picked ? 'text-white' : 'text-text-primary'}`}>{horse.sire2 || '—'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
