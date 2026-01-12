'use client';

import React from 'react';
import { X, TrendingUp, Target, Clock, Trophy, Award } from 'lucide-react';
import { Connection, HorseEntry } from '@/types';
import { ConnectionRaceProgress } from './ConnectionRaceProgress';

const roleColors = {
  jockey: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-500/10' },
  trainer: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-500/10' },
  sire: { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-500/10' },
};

const roleLabels = {
  jockey: 'Jockey',
  trainer: 'Trainer',
  sire: 'Sire',
};

interface ConnectionDetailModalProps {
  connection: Connection;
  horses: HorseEntry[];
  onClose: () => void;
  isPicked?: boolean;
  onAddPick?: () => void;
  onRemovePick?: () => void;
}

export function ConnectionDetailModal({
  connection,
  horses,
  onClose,
  isPicked = false,
  onAddPick,
  onRemovePick,
}: ConnectionDetailModalProps) {
  const colors = roleColors[connection.role];
  
  // Get horses this connection is on today
  const connectionHorses = horses.filter(h => {
    if (connection.role === 'jockey') return h.jockey === connection.name;
    if (connection.role === 'trainer') return h.trainer === connection.name;
    if (connection.role === 'sire') return h.sire1 === connection.name || h.sire2 === connection.name;
    return false;
  });
  
  // Calculate totals
  const validHorses = connectionHorses.filter(h => !h.isScratched && h.finish > 0);
  const totalExpected = validHorses.reduce((sum, h) => sum + (h.muSmooth || 0), 0);
  const totalActual = validHorses.reduce((sum, h) => sum + (h.totalPoints || 0), 0);
  const totalDiff = totalActual - totalExpected;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 ${colors.light} border-b border-border`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-white font-bold text-lg`}>
                {connection.role === 'jockey' ? 'J' : connection.role === 'trainer' ? 'T' : 'S'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">{connection.name}</h2>
                <p className={`text-sm ${colors.text}`}>{roleLabels[connection.role]}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="px-6 py-4 border-b border-border">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">Salary</p>
              <p className="text-lg font-bold text-text-primary">${connection.salary.toLocaleString()}</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">Apps</p>
              <p className="text-lg font-bold text-text-primary">{connection.apps}</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">Avg Odds</p>
              <p className="text-lg font-bold text-text-primary">{connection.avgOdds.toFixed(1)}</p>
            </div>
            <div className="text-center p-2 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">Record</p>
              <p className="text-lg font-bold text-text-primary">
                {connection.wins}-{connection.places}-{connection.shows}
              </p>
            </div>
          </div>
        </div>
        
        {/* μ/σ Stats */}
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Today's Expected Performance
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">μ (Expected)</p>
              <p className="text-xl font-bold text-text-primary">{connection.muSmooth.toFixed(1)}</p>
            </div>
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">σ (Volatility)</p>
              <p className="text-xl font-bold text-text-secondary">{connection.sigmaSmooth.toFixed(1)}</p>
            </div>
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <p className="text-xs text-text-muted">Actual Points</p>
              <p className={`text-xl font-bold ${totalDiff >= 0 ? 'text-success' : 'text-error'}`}>
                {totalActual.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Race-by-Race Progress */}
        <div className="px-6 py-4 border-b border-border overflow-x-auto">
          <h3 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Race by Race Performance
          </h3>
          <ConnectionRaceProgress connection={connection} horses={horses} />
        </div>
        
        {/* Horses Today */}
        <div className="px-6 py-4 border-b border-border max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-text-muted mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Horses Today ({connectionHorses.length})
          </h3>
          <div className="space-y-2">
            {connectionHorses.map((horse) => (
              <div 
                key={`${horse.race}-${horse.horse}`}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  horse.isScratched ? 'bg-surface-elevated/50 opacity-50' : 'bg-surface-elevated'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-muted">R{horse.race}</span>
                  <span className={`font-medium ${horse.isScratched ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                    {horse.horse}
                  </span>
                  {horse.isScratched && (
                    <span className="text-xs text-error px-1 py-0.5 bg-error/20 rounded">SCR</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-muted">{horse.mlOdds}</span>
                  {!horse.isScratched && horse.finish > 0 && (
                    <>
                      <span className="text-text-muted">Fin: {horse.finish}</span>
                      <span className={`font-bold ${horse.totalPoints >= (horse.muSmooth || 0) ? 'text-success' : 'text-error'}`}>
                        {horse.totalPoints?.toFixed(0) || 0} pts
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Action Button */}
        <div className="px-6 py-4">
          {connection.salary === 0 ? (
            <div className="w-full py-3 rounded-lg bg-surface-elevated text-text-muted text-center font-medium">
              Scratched - Cannot Select
            </div>
          ) : isPicked ? (
            <button
              onClick={onRemovePick}
              className="w-full py-3 rounded-lg bg-error/20 text-error font-bold hover:bg-error hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Remove from Picks
            </button>
          ) : (
            <button
              onClick={onAddPick}
              className="w-full py-3 rounded-lg bg-accent text-white font-bold hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
            >
              <Award className="w-5 h-5" />
              Add to Picks (${connection.salary.toLocaleString()})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
