'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Clock, Syringe } from 'lucide-react';

interface InsulinLog {
  id: string;
  units: number;
  insulin_type: string;
  taken_at: string;
  notes?: string | null;
  insulin_name?: string | null;
  delivery_type?: string;
  logged_via?: string | null;
  blood_glucose_before?: number | null;
}

interface SwipeableDoseEntryProps {
  log: InsulinLog;
  onDelete: (id: string) => void;
  formatNotes: (notes: string | null) => React.ReactNode;
  insulinTypeColors: Record<string, string>;
}

export function SwipeableDoseEntry({ 
  log, 
  onDelete, 
  formatNotes, 
  insulinTypeColors 
}: SwipeableDoseEntryProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const deltaX = currentX.current - startX.current;
    
    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -100)); // Limit swipe to 100px
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // If swiped more than 50px, show delete button
    if (swipeOffset < -50) {
      setSwipeOffset(-80);
      setShowDeleteButton(true);
    } else {
      // Snap back
      setSwipeOffset(0);
      setShowDeleteButton(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    currentX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.clientX;
    const deltaX = currentX.current - startX.current;
    
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -100));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    if (swipeOffset < -50) {
      setSwipeOffset(-80);
      setShowDeleteButton(true);
    } else {
      setSwipeOffset(0);
      setShowDeleteButton(false);
    }
  };

  const handleDelete = () => {
    onDelete(log.id);
  };

  // Reset swipe when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSwipeOffset(0);
        setShowDeleteButton(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-gradient-to-r from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
    >
      {/* Delete Button Background */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center">
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Main Content */}
      <div
        className="relative bg-gradient-to-r from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 p-4 transition-transform duration-200 ease-out touch-manipulation"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0 mt-1">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Syringe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {log.units}u
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${insulinTypeColors[log.insulin_type as keyof typeof insulinTypeColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'}`}>
                  {log.insulin_type}
                </span>
                {log.delivery_type === 'basal' && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 rounded-full font-medium">
                    🔄 Daily Basal
                  </span>
                )}
                {log.logged_via === 'csv_import' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                    📊 Imported
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-slate-400 mb-3">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {new Date(log.taken_at).toLocaleString()}
                </span>
              </div>
              {log.notes && (
                <div className="flex flex-wrap items-start gap-1">
                  {formatNotes(log.notes)}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Delete Button */}
          <div className="hidden md:flex items-center space-x-2 ml-4">
            <button
              onClick={handleDelete}
              className="p-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="Delete log"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Delete Button */}
      {showDeleteButton && (
        <button
          onClick={handleDelete}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all duration-200 md:hidden touch-manipulation"
          title="Delete log"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}

      {/* Swipe Hint */}
      {!showDeleteButton && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 md:hidden">
          <div className="flex items-center space-x-1 text-xs">
            <span>←</span>
            <span>Swipe</span>
          </div>
        </div>
      )}
    </div>
  );
}