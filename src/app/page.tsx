'use client';

import { GameProvider, useGame } from '@/contexts/GameContext';
import { StartersPanel } from '@/components/StartersPanel';
import { PlayersPanel } from '@/components/PlayersPanel';
import { PicksPanel } from '@/components/PicksPanel';
import { ResultsView } from '@/components/ResultsView';
import { HistoryPage } from '@/components/HistoryPage';
import { TrackDatePicker, TrackDateButton } from '@/components/TrackDatePicker';
import { Wallet, Sun, Moon, AlertTriangle, Home as HomeIcon, History } from 'lucide-react';
import { useState, useEffect } from 'react';

function TrackDateSelector() {
  const { 
    selectedTrack, 
    setSelectedTrack, 
    selectedDate, 
    setSelectedDate, 
    availableTracks 
  } = useGame();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  return (
    <>
      <TrackDateButton
        selectedTrack={selectedTrack}
        selectedDate={selectedDate}
        onClick={() => setIsPickerOpen(true)}
      />
      <TrackDatePicker
        availableTracks={availableTracks}
        selectedTrack={selectedTrack}
        selectedDate={selectedDate}
        onTrackChange={setSelectedTrack}
        onDateChange={setSelectedDate}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
      />
    </>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useGame();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-surface-elevated rounded-lg hover:bg-surface-hover transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-text-secondary" />
      ) : (
        <Moon className="w-5 h-5 text-text-secondary" />
      )}
    </button>
  );
}

function StackingIndicator() {
  const { lineupStats } = useGame();
  
  if (lineupStats.stackedHorses === 0) return null;
  
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg stacking-indicator">
      <AlertTriangle className="w-4 h-4 text-warning" />
      <div className="text-xs">
        <span className="font-semibold text-warning">{lineupStats.stackedHorses} stacked</span>
        <span className="text-text-muted ml-1">(σ adjusted)</span>
      </div>
    </div>
  );
}

function GameContent() {
  const { gamePhase, bankroll, isLoading, resetGame } = useGame();
  const [currentView, setCurrentView] = useState<'home' | 'results'>('home');
  
  // Switch to results view when game phase changes to results
  useEffect(() => {
    if (gamePhase === 'results') {
      setCurrentView('results');
    }
  }, [gamePhase]);
  
  // Handle going home from results
  const goHome = () => {
    if (gamePhase === 'results') {
      resetGame();
    }
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
              <span className="text-xl">🏇</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">Beat The House</h1>
              <p className="text-xs text-muted">Salary Cap Fantasy</p>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-surface-elevated rounded-lg p-1">
            <button
              onClick={goHome}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'home'
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button
              onClick={() => setCurrentView('results')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'results'
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Results</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {currentView === 'home' && <StackingIndicator />}
            
            {currentView === 'home' && <TrackDateSelector />}
            
            {/* Bankroll */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-accent/10 rounded-lg">
              <Wallet className="w-5 h-5 text-accent" />
              <span className="text-lg font-bold text-accent">${bankroll.toLocaleString()}</span>
            </div>
            
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentView === 'results' ? (
        gamePhase === 'results' ? (
          <ResultsView onGoHome={goHome} />
        ) : (
          <HistoryPage onGoHome={goHome} />
        )
      ) : (
        <main className="max-w-[1800px] mx-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent mx-auto mb-4"></div>
                <p className="text-text-muted">Loading race data...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-100px)]">
              {/* Starters Panel */}
              <div className="order-2 lg:order-1 overflow-y-auto lg:h-full h-[500px]">
                <StartersPanel />
              </div>

              {/* Players Panel */}
              <div className="order-1 lg:order-2 overflow-y-auto lg:h-full h-[500px]">
                <PlayersPanel />
              </div>

              {/* Picks Panel */}
              <div className="order-3 overflow-y-auto lg:h-full h-auto">
                <PicksPanel />
              </div>
        </div>
          )}
      </main>
      )}
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
