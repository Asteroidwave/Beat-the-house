'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, X } from 'lucide-react';

interface TrackDatePickerProps {
  availableTracks: { code: string; name: string; dates: string[] }[];
  selectedTrack: string;
  selectedDate: string;
  onTrackChange: (track: string) => void;
  onDateChange: (date: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const TRACK_NAMES: Record<string, string> = {
  AQU: 'Aqueduct',
  SA: 'Santa Anita',
  GP: 'Gulfstream Park',
  DMR: 'Del Mar',
  PRX: 'Parx Racing',
  PEN: 'Penn National',
  LRL: 'Laurel Park',
  MVR: 'Mountaineer',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function TrackDatePicker({
  availableTracks,
  selectedTrack,
  selectedDate,
  onTrackChange,
  onDateChange,
  isOpen,
  onClose,
}: TrackDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate || new Date());
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  
  // Get available dates for selected track
  const trackData = availableTracks.find(t => t.code === selectedTrack);
  const availableDatesSet = useMemo(() => {
    if (!trackData) return new Set<string>();
    return new Set(trackData.dates);
  }, [trackData]);
  
  // Get available months for the track
  const availableMonths = useMemo(() => {
    if (!trackData) return [];
    const months = new Set<string>();
    trackData.dates.forEach(date => {
      const d = new Date(date);
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(months).sort();
  }, [trackData]);
  
  // Check if current month has any race days
  const hasRaceDaysInMonth = useMemo(() => {
    const key = `${currentMonth.year}-${currentMonth.month}`;
    return availableMonths.includes(key);
  }, [availableMonths, currentMonth]);
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1);
    const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: { date: Date; isCurrentMonth: boolean; hasRaces: boolean; isSelected: boolean }[] = [];
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(currentMonth.year, currentMonth.month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        hasRaces: false,
        isSelected: false,
      });
    }
    
    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(currentMonth.year, currentMonth.month, day);
      const dateStr = date.toISOString().split('T')[0];
      const hasRaces = availableDatesSet.has(dateStr);
      const isSelected = dateStr === selectedDate;
      
      days.push({
        date,
        isCurrentMonth: true,
        hasRaces,
        isSelected,
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(currentMonth.year, currentMonth.month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        hasRaces: false,
        isSelected: false,
      });
    }
    
    return days;
  }, [currentMonth, availableDatesSet, selectedDate]);
  
  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };
  
  const handleDateSelect = (day: typeof calendarDays[0]) => {
    if (!day.hasRaces || !day.isCurrentMonth) return;
    const dateStr = day.date.toISOString().split('T')[0];
    onDateChange(dateStr);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="font-bold text-text-primary">Select Race Date</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Track Selector */}
        <div className="px-4 py-3 border-b border-border">
          <label className="text-xs text-text-muted mb-2 block flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Track
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTracks.map(track => (
              <button
                key={track.code}
                onClick={() => onTrackChange(track.code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedTrack === track.code
                    ? 'bg-accent text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {track.code}
              </button>
            ))}
          </div>
          {trackData && (
            <p className="text-xs text-text-muted mt-2">
              {TRACK_NAMES[trackData.code] || trackData.code} • {trackData.dates.length} race days
            </p>
          )}
        </div>
        
        {/* Calendar */}
        <div className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-text-primary">
              {MONTHS[currentMonth.month]} {currentMonth.year}
            </h3>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-text-muted py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDateSelect(day)}
                disabled={!day.hasRaces || !day.isCurrentMonth}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                  ${!day.isCurrentMonth ? 'text-text-muted/30' : ''}
                  ${day.isCurrentMonth && !day.hasRaces ? 'text-text-muted cursor-not-allowed' : ''}
                  ${day.hasRaces && day.isCurrentMonth ? 'bg-success/20 text-success hover:bg-success hover:text-white font-medium cursor-pointer' : ''}
                  ${day.isSelected ? 'bg-error text-white ring-2 ring-error ring-offset-2 ring-offset-surface' : ''}
                `}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-success/20" />
              <span>Race Day</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-error" />
              <span>Selected</span>
            </div>
          </div>
        </div>
        
        {/* Current Selection */}
        {selectedDate && (
          <div className="px-4 py-3 border-t border-border bg-surface-elevated/50">
            <p className="text-sm text-center">
              <span className="text-text-muted">Selected: </span>
              <span className="font-bold text-text-primary">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="text-text-muted"> at </span>
              <span className="font-bold text-accent">{TRACK_NAMES[selectedTrack] || selectedTrack}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact button version for the header
export function TrackDateButton({
  selectedTrack,
  selectedDate,
  onClick,
}: {
  selectedTrack: string;
  selectedDate: string;
  onClick: () => void;
}) {
  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Select Date';
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border transition-colors"
    >
      <MapPin className="w-4 h-4 text-accent" />
      <span className="font-medium text-text-primary">{selectedTrack}</span>
      <span className="text-text-muted">•</span>
      <Calendar className="w-4 h-4 text-text-muted" />
      <span className="text-text-secondary">{formattedDate}</span>
    </button>
  );
}
