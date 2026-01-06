'use client';

import React, { useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { HorseEntry } from '@/types';

// Program number (saddlecloth) colors - accurate to real racing
const getProgramNumberBadge = (programNumber?: number | null) => {
  if (!programNumber || programNumber < 1) {
    return { bg: 'bg-gray-400', text: 'text-white', number: null };
  }
  
  const colors: Record<number, { bg: string; text: string }> = {
    1: { bg: 'bg-[#DC2626]', text: 'text-white' },        // Red
    2: { bg: 'bg-[#F0FFFF]', text: 'text-black' },        // White/Light Blue
    3: { bg: 'bg-[#005CE8]', text: 'text-white' },        // Blue
    4: { bg: 'bg-[#ECC94B]', text: 'text-black' },        // Yellow
    5: { bg: 'bg-[#16A34A]', text: 'text-white' },        // Green
    6: { bg: 'bg-[#000000]', text: 'text-white' },        // Black
    7: { bg: 'bg-[#F97316]', text: 'text-black' },        // Orange
    8: { bg: 'bg-[#F9A8D4]', text: 'text-black' },        // Pink
    9: { bg: 'bg-[#14B8A6]', text: 'text-white' },        // Turquoise
    10: { bg: 'bg-[#7C3AED]', text: 'text-white' },       // Purple
    11: { bg: 'bg-[#64748B]', text: 'text-white' },       // Gray
    12: { bg: 'bg-[#84CC16]', text: 'text-black' },       // Lime
    13: { bg: 'bg-[#8B4513]', text: 'text-white' },       // Brown
    14: { bg: 'bg-[#800020]', text: 'text-white' },       // Maroon
    15: { bg: 'bg-[#1E3A5F]', text: 'text-white' },       // Navy
    16: { bg: 'bg-[#FFD700]', text: 'text-black' },       // Gold
  };
  
  if (programNumber <= 16 && colors[programNumber]) {
    return { ...colors[programNumber], number: programNumber };
  }
  
  // Cycle through colors for numbers > 16
  const colorArray = Object.values(colors);
  const index = (programNumber - 1) % colorArray.length;
  return { ...colorArray[index], number: programNumber };
};

// Role badge styles - just the badge, not the name background
const ROLE_BADGES = {
  jockey: { label: 'J', bg: 'bg-blue-500', text: 'text-white' },
  trainer: { label: 'T', bg: 'bg-green-500', text: 'text-white' },
  sire: { label: 'S', bg: 'bg-amber-500', text: 'text-white' },
};

export function StartersPanel() {
  const { 
    horses, 
    isLoading, 
    connections, 
    addPick, 
    isConnectionPicked,
    filterState,
    toggleHorseFilter,
    clearPlayerFilters,
    getPlayerHighlightColor,
    selectedDate,
  } = useGame();
  
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
    groups.forEach((entries) => {
      entries.sort((a, b) => a.pp - b.pp);
    });
    
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [horses]);

  // Filter horses based on selected players - show only horses that selected player is on
  const filteredRaceGroups = useMemo(() => {
    if (filterState.selectedPlayers.length === 0) {
      return raceGroups;
    }
    
    // Filter to only show horses where selected players are connected
    return raceGroups.map(([raceNum, entries]) => {
      const filteredEntries = entries.filter(horse => {
        // Check if any selected player is on this horse
        return filterState.selectedPlayers.some(player => {
          if (player.role === 'jockey') return horse.jockey === player.name;
          if (player.role === 'trainer') return horse.trainer === player.name;
          if (player.role === 'sire') return horse.sire1 === player.name || horse.sire2 === player.name;
          return false;
        });
      });
      return [raceNum, filteredEntries] as [number, HorseEntry[]];
    }).filter(([, entries]) => entries.length > 0);
  }, [raceGroups, filterState.selectedPlayers]);

  const handleConnectionClick = (name: string, role: 'jockey' | 'trainer' | 'sire') => {
    const connection = connections.find(c => c.name === name && c.role === role);
    if (connection && !isConnectionPicked(connection.id)) {
      addPick(connection);
    }
  };

  const handleHorseClick = (horse: HorseEntry) => {
    const horseId = `${horse.date}-${horse.race}-${horse.horse}`;
    toggleHorseFilter(horse.race, horse.horse, horseId);
  };

  const getConnectionHighlight = (name: string, role: 'jockey' | 'trainer' | 'sire') => {
    const connection = connections.find(c => c.name === name && c.role === role);
    if (!connection) return null;
    return getPlayerHighlightColor(connection.id);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
        <p className="text-xs text-text-muted">{formatDate(selectedDate)} • Aqueduct</p>
      </div>
      
      {/* Filter chips for selected players */}
      {filterState.selectedPlayers.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-surface-elevated/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">Showing horses for:</span>
            {filterState.selectedPlayers.map((player) => {
              const color = getPlayerHighlightColor(player.id);
              return (
                <span 
                  key={player.id} 
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${color?.light || 'bg-accent/20'} ${color?.border || 'border-accent'} border`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${ROLE_BADGES[player.role].bg} ${ROLE_BADGES[player.role].text}`}>
                    {ROLE_BADGES[player.role].label}
                  </span>
                  <span className="text-text-primary">{player.name}</span>
                </span>
              );
            })}
            <button 
              onClick={clearPlayerFilters}
              className="text-xs text-accent hover:underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {filteredRaceGroups.map(([raceNum, entries]) => (
          <div key={raceNum} className="border-b border-border last:border-b-0">
            {/* Race Header */}
            <div className="bg-surface-elevated px-4 py-2 text-xs font-medium text-text-secondary border-b border-border">
              {formatDate(selectedDate)} • Aqueduct • Race {raceNum}
            </div>
            
            {/* Horse Entries */}
            {entries.map((horse, idx) => {
              const isScratched = horse.isScratched || horse.horse.includes('SCR');
              const badgeStyle = getProgramNumberBadge(horse.pp);
              const horseId = `${horse.date}-${horse.race}-${horse.horse}`;
              const isHorseSelected = filterState.selectedHorses.some(h => h.horseId === horseId);
              
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
              
              // Get highlight colors for filtered players
              const jockeyHighlight = getConnectionHighlight(horse.jockey, 'jockey');
              const trainerHighlight = getConnectionHighlight(horse.trainer, 'trainer');
              const sire1Highlight = horse.sire1 ? getConnectionHighlight(horse.sire1, 'sire') : null;
              const sire2Highlight = horse.sire2 ? getConnectionHighlight(horse.sire2, 'sire') : null;
              
              return (
                <div
                  key={`${horse.race}-${horse.horse}-${idx}`}
                  className={`flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-b-0 transition-colors ${
                    isScratched ? 'opacity-40' : ''
                  } ${isHorseSelected ? 'bg-accent/10' : 'hover:bg-surface-hover'}`}
                >
                  {/* Left: PP + Odds + Horse (clickable to filter players) */}
                  <button
                    onClick={() => !isScratched && handleHorseClick(horse)}
                    disabled={isScratched}
                    className="w-[140px] shrink-0 flex flex-col gap-1 text-left"
                  >
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
                  </button>
                  
                  {/* Right: Connections in 2x2 grid - colors only on badges */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Row 1: Jockey & Trainer */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => !isScratched && handleConnectionClick(horse.jockey, 'jockey')}
                        disabled={isScratched || jockeyPicked}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          jockeyPicked
                            ? 'bg-blue-500/20 border border-blue-500'
                            : jockeyHighlight
                            ? `${jockeyHighlight.light} border ${jockeyHighlight.border}`
                            : isScratched
                            ? 'bg-surface cursor-not-allowed'
                            : 'hover:bg-surface-hover cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${ROLE_BADGES.jockey.bg} ${ROLE_BADGES.jockey.text}`}>
                          J
                        </span>
                        <span className={`truncate font-medium ${jockeyPicked ? 'text-blue-500' : 'text-text-primary'}`}>
                          {horse.jockey}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => !isScratched && handleConnectionClick(horse.trainer, 'trainer')}
                        disabled={isScratched || trainerPicked}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          trainerPicked
                            ? 'bg-green-500/20 border border-green-500'
                            : trainerHighlight
                            ? `${trainerHighlight.light} border ${trainerHighlight.border}`
                            : isScratched
                            ? 'bg-surface cursor-not-allowed'
                            : 'hover:bg-surface-hover cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${ROLE_BADGES.trainer.bg} ${ROLE_BADGES.trainer.text}`}>
                          T
                        </span>
                        <span className={`truncate font-medium ${trainerPicked ? 'text-green-500' : 'text-text-primary'}`}>
                          {horse.trainer}
                        </span>
                      </button>
                    </div>
                    
                    {/* Row 2: Sire 1 & Sire 2 */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => !isScratched && horse.sire1 && handleConnectionClick(horse.sire1, 'sire')}
                        disabled={isScratched || sire1Picked || !horse.sire1}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          sire1Picked
                            ? 'bg-amber-500/20 border border-amber-500'
                            : sire1Highlight
                            ? `${sire1Highlight.light} border ${sire1Highlight.border}`
                            : isScratched || !horse.sire1
                            ? 'bg-surface cursor-not-allowed'
                            : 'hover:bg-surface-hover cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${ROLE_BADGES.sire.bg} ${ROLE_BADGES.sire.text}`}>
                          S
                        </span>
                        <span className={`truncate font-medium ${sire1Picked ? 'text-amber-500' : 'text-text-primary'}`}>
                          {horse.sire1 || '—'}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => !isScratched && horse.sire2 && handleConnectionClick(horse.sire2, 'sire')}
                        disabled={isScratched || sire2Picked || !horse.sire2}
                        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                          sire2Picked
                            ? 'bg-amber-500/20 border border-amber-500'
                            : sire2Highlight
                            ? `${sire2Highlight.light} border ${sire2Highlight.border}`
                            : isScratched || !horse.sire2
                            ? 'bg-surface cursor-not-allowed'
                            : 'hover:bg-surface-hover cursor-pointer'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${ROLE_BADGES.sire.bg} ${ROLE_BADGES.sire.text}`}>
                          S
                        </span>
                        <span className={`truncate font-medium ${sire2Picked ? 'text-amber-500' : 'text-text-primary'}`}>
                          {horse.sire2 || '—'}
                        </span>
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
