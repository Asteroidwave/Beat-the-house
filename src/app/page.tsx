'use client';

import { GameProvider, useGame } from '@/contexts/GameContext';
import { StartersPanel } from '@/components/StartersPanel';
import { PlayersPanel } from '@/components/PlayersPanel';
import { PicksPanel } from '@/components/PicksPanel';
import { ResultsView } from '@/components/ResultsView';
import { HistoryPage } from '@/components/HistoryPage';
import { Wallet, Sun, Moon, Calendar, ChevronDown, AlertTriangle, Home as HomeIcon, History } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

function DateSelector() {
  const { selectedDate, setSelectedDate, availableDates } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const currentDateInfo = availableDates.find(d => d.date === selectedDate);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-surface-elevated rounded-lg hover:bg-surface-hover transition-colors"
      >
        <Calendar className="w-4 h-4 text-text-muted" />
        <div className="text-left">
          <div className="text-xs text-text-muted uppercase tracking-wider">Date</div>
          <div className="font-semibold text-text-primary">{formatDate(selectedDate)}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            {availableDates.map((dateInfo) => (
              <button
                key={dateInfo.date}
                onClick={() => {
                  setSelectedDate(dateInfo.date);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                  dateInfo.date === selectedDate
                    ? 'bg-accent/20 text-accent'
                    : 'hover:bg-surface-hover text-text-primary'
                }`}
              >
                <span className="font-medium">{formatDate(dateInfo.date)}</span>
                <span className="text-xs text-text-muted">
                  {dateInfo.raceCount} races • {dateInfo.horseCount - dateInfo.scratchCount} horses
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
            
            {currentView === 'home' && (
              <>
                <div className="hidden md:block text-right">
                  <div className="text-xs text-muted uppercase tracking-wider">Track</div>
                  <div className="font-semibold text-primary">Aqueduct</div>
                </div>
                
                <DateSelector />
              </>
            )}
            
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
