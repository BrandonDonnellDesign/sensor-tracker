'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function SearchButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // TODO: Implement actual search functionality
    router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        data-search-trigger
        className="flex items-center justify-center rounded-lg w-9 h-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
        aria-label="Search (Alt+S)"
        title="Search (Alt+S)"
      >
        <Search className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-screen max-w-md rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-4 z-50">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  className="h-12 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
                  placeholder="Search sensors, readings, settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="mt-3 px-2 text-xs text-gray-500 dark:text-slate-400">
                Press <kbd className="rounded bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 text-gray-900 dark:text-slate-100">Enter</kbd> to search
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}