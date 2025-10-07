'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { MagnifyingGlassIcon, ClockIcon, TagIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'sensor' | 'note' | 'tag';
  title: string;
  description: string;
  url: string;
  date: string;
  metadata?: any;
}

export default function SearchPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    if (query && user) {
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query, user, performSearch]);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!user?.id || !searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      // Search sensors by serial number, lot number, or notes
      const { data: sensors, error: sensorsError } = await (supabase as any)
        .from('sensors')
        .select(`
          id,
          serial_number,
          lot_number,
          date_added,
          issue_notes,
          is_problematic,
          sensor_models (
            manufacturer,
            model_name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .or(`serial_number.ilike.%${searchTerm}%,lot_number.ilike.%${searchTerm}%,issue_notes.ilike.%${searchTerm}%`);

      if (!sensorsError && sensors) {
        sensors.forEach((sensor: any) => {
          searchResults.push({
            id: sensor.id,
            type: 'sensor',
            title: `${sensor.sensor_models?.manufacturer || 'Unknown'} ${sensor.sensor_models?.model_name || 'Sensor'}`,
            description: `Serial: ${sensor.serial_number}${sensor.lot_number ? ` • Lot: ${sensor.lot_number}` : ''}${sensor.is_problematic ? ' • Has Issues' : ''}`,
            url: `/dashboard/sensors/${sensor.id}`,
            date: sensor.date_added,
            metadata: {
              serial_number: sensor.serial_number,
              lot_number: sensor.lot_number,
              is_problematic: sensor.is_problematic
            }
          });
        });
      }

      // Search tags
      const { data: tags, error: tagsError } = await (supabase as any)
        .from('tags')
        .select('*')
        .ilike('name', `%${searchTerm}%`);

      if (!tagsError && tags) {
        tags.forEach((tag: any) => {
          searchResults.push({
            id: tag.id,
            type: 'tag',
            title: tag.name,
            description: `${tag.category} tag${tag.description ? ` • ${tag.description}` : ''}`,
            url: `/dashboard/sensors?tag=${tag.id}`,
            date: tag.created_at,
            metadata: {
              category: tag.category,
              color: tag.color
            }
          });
        });
      }

      // Search sensor notes (issue_notes)
      const { data: sensorsWithNotes, error: notesError } = await (supabase as any)
        .from('sensors')
        .select(`
          id,
          serial_number,
          issue_notes,
          date_added,
          sensor_models (
            manufacturer,
            model_name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .not('issue_notes', 'is', null)
        .ilike('issue_notes', `%${searchTerm}%`);

      if (!notesError && sensorsWithNotes) {
        sensorsWithNotes.forEach((sensor: any) => {
          // Avoid duplicates if already found in sensor search
          if (!searchResults.find(r => r.id === sensor.id && r.type === 'sensor')) {
            searchResults.push({
              id: `${sensor.id}-note`,
              type: 'note',
              title: `Note: ${sensor.sensor_models?.manufacturer || 'Unknown'} ${sensor.sensor_models?.model_name || 'Sensor'}`,
              description: sensor.issue_notes.substring(0, 100) + (sensor.issue_notes.length > 100 ? '...' : ''),
              url: `/dashboard/sensors/${sensor.id}`,
              date: sensor.date_added,
              metadata: {
                serial_number: sensor.serial_number,
                full_note: sensor.issue_notes
              }
            });
          }
        });
      }

      // Sort results by relevance and date
      searchResults.sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.title.toLowerCase().includes(searchTerm.toLowerCase());
        const bExact = b.title.toLowerCase().includes(searchTerm.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then sort by date (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.history.pushState({}, '', `/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'sensor':
        return <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>;
      case 'tag':
        return <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <TagIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>;
      case 'note':
        return <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
          <DocumentTextIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>;
      default:
        return <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900/30 rounded-full flex items-center justify-center">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Search Results</h1>
          {query && (
            <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
              Results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
        
        {/* Search Form */}
        <form onSubmit={handleNewSearch} className="flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              className="h-10 w-full sm:w-80 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 text-sm"
              placeholder="Search sensors, tags, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Search Results */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
              {query ? 'No results found' : 'Start searching'}
            </h3>
            <p className="text-gray-600 dark:text-slate-400">
              {query 
                ? `No sensors, tags, or notes match "${query}"`
                : 'Enter a search term to find your sensors, tags, and notes'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.url}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {result.title}
                      </h3>
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300 capitalize">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2 mb-2">
                      {result.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-slate-400">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      {new Date(result.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Search Tips */}
      {!loading && results.length === 0 && !query && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">Search Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-medium mb-2">What you can search:</h4>
              <ul className="space-y-1">
                <li>• Sensor serial numbers</li>
                <li>• Lot numbers</li>
                <li>• Issue notes and descriptions</li>
                <li>• Tag names and categories</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Search examples:</h4>
              <ul className="space-y-1">
                <li>• &ldquo;G123456&rdquo; (serial number)</li>
                <li>• &ldquo;adhesive&rdquo; (issue type)</li>
                <li>• &ldquo;expired&rdquo; (tag name)</li>
                <li>• &ldquo;accuracy&rdquo; (note content)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}