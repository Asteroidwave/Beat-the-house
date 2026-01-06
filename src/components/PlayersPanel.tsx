'use client';

import React, { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { ConnectionRole } from '@/types';
import { Plus, X, Filter } from 'lucide-react';

type FilterType = 'all' | ConnectionRole;

const filterTabs: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'jockey', label: 'Jockeys' },
  { value: 'trainer', label: 'Trainers' },
  { value: 'sire', label: 'Sires' },
];

const roleColors = {
  jockey: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-500/10' },
  trainer: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-500/10' },
  sire: { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-500/10' },
};

const roleLabels = {
  jockey: 'J',
  trainer: 'T',
  sire: 'S',
};

export function PlayersPanel() {
  const { 
    connections, 
    horses,
    isLoading, 
    addPick, 
    removePick, 
    isConnectionPicked, 
    lineupStats, 
    salaryMax,
    filterState,
    togglePlayerFilter,
    clearHorseFilters,
    getPlayerHighlightColor,
  } = useGame();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'salary' | 'apps' | 'avgOdds' | 'name'>('salary');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Filter connections based on selected horses
  const filteredByHorses = useMemo(() => {
    if (filterState.selectedHorses.length === 0) {
      return connections;
    }
    
    // Get all connection names from selected horses
    const selectedHorseIds = new Set(filterState.selectedHorses.map(h => h.horseId));
    const validConnectionNames = new Set<string>();
    
    horses.forEach(horse => {
      const horseId = `${horse.date}-${horse.race}-${horse.horse}`;
      if (selectedHorseIds.has(horseId)) {
        validConnectionNames.add(`jockey-${horse.jockey}`);
        validConnectionNames.add(`trainer-${horse.trainer}`);
        if (horse.sire1) validConnectionNames.add(`sire-${horse.sire1}`);
        if (horse.sire2) validConnectionNames.add(`sire-${horse.sire2}`);
      }
    });
    
    return connections.filter(c => validConnectionNames.has(`${c.role}-${c.name}`));
  }, [connections, horses, filterState.selectedHorses]);

  const filteredConnections = useMemo(() => {
    let filtered = filteredByHorses;

    if (filter !== 'all') {
      filtered = filtered.filter((c) => c.role === filter);
    }

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'salary':
          comparison = a.salary - b.salary;
          break;
        case 'apps':
          comparison = a.apps - b.apps;
          break;
        case 'avgOdds':
          comparison = a.avgOdds - b.avgOdds;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });
  }, [filteredByHorses, filter, sortBy, sortDir]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const canAddConnection = (salary: number) => {
    return salary > 0 && lineupStats.totalSalary + salary <= salaryMax;
  };

  if (isLoading) {
    return (
      <div className="panel">
        <h2 className="panel-header">Players</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <h2 className="panel-header flex-shrink-0">Players</h2>
      
      {/* Horse filter chips */}
      {filterState.selectedHorses.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-surface-elevated/50 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3 h-3 text-text-muted" />
            <span className="text-xs text-text-muted">Horses:</span>
            {filterState.selectedHorses.map((horse) => (
              <span 
                key={horse.horseId} 
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-accent/20 border border-accent text-text-primary"
              >
                R{horse.raceNumber}: {horse.horseName}
              </span>
            ))}
            <button 
              onClick={clearHorseFilters}
              className="text-xs text-accent hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-lg mb-4 flex-shrink-0">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-accent text-white'
                : 'text-muted hover:text-primary hover:bg-surface-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[auto_1fr_80px_60px_80px_40px] gap-2 px-3 py-2 text-xs font-medium text-muted uppercase tracking-wider border-b border-border flex-shrink-0">
        <div></div>
        <button onClick={() => handleSort('name')} className="text-left hover:text-primary">
          Player {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('salary')} className="text-right hover:text-primary">
          Salary {sortBy === 'salary' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('apps')} className="text-right hover:text-primary">
          App. {sortBy === 'apps' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('avgOdds')} className="text-right hover:text-primary">
          Avg. Odds {sortBy === 'avgOdds' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <div></div>
      </div>

      {/* Connection List */}
      <div className="divide-y divide-border flex-1 overflow-y-auto min-h-0">
        {filteredConnections.map((conn) => {
          const isPicked = isConnectionPicked(conn.id);
          const isScratched = conn.salary === 0; // 0 salary means scratched
          const canAdd = canAddConnection(conn.salary);
          const highlightColor = getPlayerHighlightColor(conn.id);
          const isFiltering = filterState.selectedPlayers.some(p => p.id === conn.id);
          const colors = roleColors[conn.role];

          return (
            <div
              key={conn.id}
              className={`grid grid-cols-[auto_1fr_80px_60px_80px_40px] gap-2 px-3 py-3 items-center transition-colors ${
                isScratched
                  ? 'opacity-40'
                  : isPicked 
                  ? `${colors.light} border-l-2 ${colors.text.replace('text-', 'border-')}`
                  : highlightColor 
                  ? `${highlightColor.light} border-l-2 ${highlightColor.border}`
                  : 'hover:bg-surface-hover'
              }`}
            >
              {/* Role Badge */}
              <button
                onClick={() => !isScratched && togglePlayerFilter(conn)}
                disabled={isScratched}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform ${colors.bg} ${
                  isScratched ? 'opacity-50 cursor-not-allowed' : isFiltering ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent scale-110' : 'hover:scale-110'
                }`}
                title={isScratched ? 'Scratched' : 'Click to filter starters by this player'}
              >
                {roleLabels[conn.role]}
              </button>

              {/* Name */}
              <div className="min-w-0">
                <div className={`font-medium truncate ${isScratched ? 'line-through text-text-muted' : isPicked ? colors.text : 'text-primary'}`}>
                  {conn.name}
                  {isScratched && <span className="ml-1 text-xs text-error no-underline">(SCR)</span>}
                </div>
                <div className="text-xs text-muted">
                  {conn.wins}-{conn.places}-{conn.shows}
                </div>
              </div>

              {/* Salary */}
              <div className={`text-right font-medium ${isScratched ? 'line-through text-text-muted' : isPicked ? colors.text : 'text-primary'}`}>
                {isScratched ? '—' : `$${conn.salary.toLocaleString()}`}
              </div>

              {/* Apps */}
              <div className="text-right text-muted">{conn.apps.toString().padStart(2, '0')}</div>

              {/* Avg Odds */}
              <div className="text-right text-muted">{conn.avgOdds.toFixed(2)}</div>

              {/* Add/Remove Button - Fixed visibility for light mode */}
              <button
                onClick={() => (isPicked ? removePick(conn.id) : addPick(conn))}
                disabled={isScratched || (!canAdd && !isPicked)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  isScratched
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                    : isPicked
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                    : canAdd
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isPicked ? <X size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
              </button>
            </div>
          );
        })}
        
        {filteredConnections.length === 0 && (
          <div className="py-8 text-center text-text-muted">
            No players match the current filters
          </div>
        )}
      </div>
    </div>
  );
}
