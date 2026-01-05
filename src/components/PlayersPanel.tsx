'use client';

import React, { useState, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { ConnectionRole } from '@/types';
import { Plus, Minus } from 'lucide-react';

type FilterType = 'all' | ConnectionRole;

const filterTabs: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'jockey', label: 'Jockeys' },
  { value: 'trainer', label: 'Trainers' },
  { value: 'sire', label: 'Sires' },
];

const roleColors = {
  jockey: '#3b82f6',
  trainer: '#ef4444',
  sire: '#22c55e',
};

const roleLabels = {
  jockey: 'J',
  trainer: 'T',
  sire: 'S',
};

export function PlayersPanel() {
  const { connections, isLoading, addPick, removePick, isConnectionPicked, lineupStats, salaryMax } = useGame();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'salary' | 'apps' | 'avgOdds' | 'name'>('salary');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredConnections = useMemo(() => {
    let filtered = connections;

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
  }, [connections, filter, sortBy, sortDir]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const canAddConnection = (salary: number) => {
    return lineupStats.totalSalary + salary <= salaryMax;
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
    <div className="panel">
      <h2 className="panel-header">Players</h2>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-lg mb-4">
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
      <div className="grid grid-cols-[auto_1fr_80px_60px_80px_40px] gap-2 px-3 py-2 text-xs font-medium text-muted uppercase tracking-wider border-b border-border">
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
      <div className="divide-y divide-border max-h-[calc(100vh-320px)] overflow-y-auto">
        {filteredConnections.map((conn) => {
          const isPicked = isConnectionPicked(conn.id);
          const canAdd = canAddConnection(conn.salary);

          return (
            <div
              key={conn.id}
              className={`grid grid-cols-[auto_1fr_80px_60px_80px_40px] gap-2 px-3 py-3 items-center transition-colors ${
                isPicked ? 'bg-accent/10' : 'hover:bg-surface-hover'
              }`}
            >
              {/* Role Badge */}
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: roleColors[conn.role] }}
              >
                {roleLabels[conn.role]}
              </span>

              {/* Name */}
              <div className="min-w-0">
                <div className="font-medium text-primary truncate">{conn.name}</div>
                <div className="text-xs text-muted">
                  {conn.wins}-{conn.places}-{conn.shows}
                </div>
              </div>

              {/* Salary */}
              <div className="text-right font-medium text-primary">
                ${conn.salary.toLocaleString()}
              </div>

              {/* Apps */}
              <div className="text-right text-muted">{conn.apps.toString().padStart(2, '0')}</div>

              {/* Avg Odds */}
              <div className="text-right text-muted">{conn.avgOdds.toFixed(2)}</div>

              {/* Add/Remove Button */}
              <button
                onClick={() => isPicked ? removePick(conn.id) : addPick(conn)}
                disabled={!isPicked && !canAdd}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isPicked
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : canAdd
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isPicked ? <Minus size={16} /> : <Plus size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
