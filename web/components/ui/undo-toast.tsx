'use client';

import { useEffect, useState } from 'react';
import { Undo, X } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function UndoToast({ message, onUndo, duration = 5000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 dark:bg-slate-800 text-white rounded-lg shadow-lg px-4 py-3 flex items-center space-x-4 min-w-[300px]">
        <span className="text-sm flex-1">{message}</span>
        <button
          onClick={() => {
            onUndo();
            setIsVisible(false);
          }}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm font-medium"
        >
          <Undo className="h-3 w-3" />
          <span>Undo</span>
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-gray-800 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
