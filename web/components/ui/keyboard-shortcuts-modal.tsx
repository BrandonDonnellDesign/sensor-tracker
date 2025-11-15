'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: 'H', description: 'Go to Dashboard' },
  { key: 'F', description: 'Go to Food' },
  { key: 'I', description: 'Go to Insulin' },
  { key: 'S', description: 'Go to Sensors' },
  { key: 'G', description: 'Go to Glucose Data' },
  { key: 'A', description: 'Go to Analytics' },
  { key: ',', description: 'Go to Settings' },
  { key: 'K', ctrl: true, description: 'Quick search' },
  { key: '?', shift: true, description: 'Show this help' },
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShow = () => setIsOpen(true);
    window.addEventListener('show-shortcuts', handleShow);
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('show-shortcuts', handleShow);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <Keyboard className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
              >
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  {shortcut.description}
                </span>
                <div className="flex items-center space-x-1">
                  {shortcut.ctrl && (
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded shadow-sm">
                      {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                    </kbd>
                  )}
                  {shortcut.shift && (
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded shadow-sm">
                      Shift
                    </kbd>
                  )}
                  {shortcut.alt && (
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded shadow-sm">
                      Alt
                    </kbd>
                  )}
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-600 border border-blue-300 dark:border-blue-700 rounded">?</kbd> anytime to see this help
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
