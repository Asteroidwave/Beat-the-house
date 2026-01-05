'use client';

import { GameProvider, useGame } from '@/contexts/GameContext';
import { StartersPanel } from '@/components/StartersPanel';
import { PlayersPanel } from '@/components/PlayersPanel';
import { PicksPanel } from '@/components/PicksPanel';
import { ResultsView } from '@/components/ResultsView';
import { Wallet } from 'lucide-react';

function GameContent() {
  const { gamePhase, bankroll } = useGame();

  if (gamePhase === 'results') {
    return <ResultsView />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
              <span className="text-xl">🏇</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">Beat The House</h1>
              <p className="text-xs text-muted">Salary Cap Fantasy</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Bankroll */}
            <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg">
              <Wallet className="w-4 h-4 text-accent" />
              <div>
                <div className="text-[10px] text-muted uppercase tracking-wider">Bankroll</div>
                <div className="font-bold text-accent">${bankroll.toLocaleString()}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted uppercase tracking-wider">Track</div>
              <div className="font-semibold text-primary">Aqueduct</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted uppercase tracking-wider">Date</div>
              <div className="font-semibold text-primary">Dec 12, 2025</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Panel Layout */}
      <main className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-100px)]">
          {/* Starters Panel */}
          <div className="overflow-y-auto">
            <StartersPanel />
          </div>

          {/* Players Panel */}
          <div className="overflow-y-auto">
            <PlayersPanel />
          </div>

          {/* Picks Panel */}
          <div className="overflow-y-auto">
            <PicksPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
