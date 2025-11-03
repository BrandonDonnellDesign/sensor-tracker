'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
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
  const [allSensors, setAllSensors] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);

  // Fetch all sensors and tags once
  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const supabase = createClient();
      // Fetch all sensors
      const { data: sensors, error: sensorsError } = await (supabase as any)
        .from('sensors')
        .select(`
          id,
          serial_number,
          lot_number,
          date_added,
          issue_notes,
          is_problematic,
          sensor_type,
          sensor_models (
            manufacturer,
            model_name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .is('archived_at', null);

      if (!sensorsError && sensors) {
        setAllSensors(sensors);
      }

      // Fetch all tags
      const { data: tags, error: tagsError } = await (supabase as any)
        .from('tags')
        .select('*');

      if (!tagsError && tags) {
        setAllTags(tags);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Client-side search - same as sensors page
  const performSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowerSearch = searchTerm.toLowerCase();

    // Search sensors - client-side filtering like in sensors page
    allSensors.forEach((sensor: any) => {
      const matchesSearch = 
        sensor.serial_number.toLowerCase().includes(lowerSearch) ||
        (sensor.lot_number && sensor.lot_number.toLowerCase().includes(lowerSearch)) ||
        (sensor.issue_notes && sensor.issue_notes.toLowerCase().includes(lowerSearch)) ||
        sensor.sensor_type.toLowerCase().includes(lowerSearch);

      if (matchesSearch) {
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
      }
    });

    // Search tags
    allTags.forEach((tag: any) => {
      if (tag.name.toLowerCase().includes(lowerSearch)) {
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
      }
    });

    // Sort results by relevance and date
    searchResults.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.title.toLowerCase() === lowerSearch;
      const bExact = b.title.toLowerCase() === lowerSearch;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    setResults(searchResults);
  }, [allSensors, allTags]);

  // Fetch data on mount
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Perform search when query or data changes
  useEffect(() => {
    if (query && allSensors.length > 0) {
      performSearch(query);
    } else if (!query) {
      setResults([]);
      setLoading(false);
    }
  }, [query, allSensors, allTags, performSearch]);

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
        return <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>;
      case 'tag':
        return <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
          <TagIcon className="w-4 h-4 text-green-400" />
        </div>;
      case 'note':
        return <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
          <DocumentTextIcon className="w-4 h-4 text-purple-400" />
        </div>;
      default:
        return <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
        </div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Search Results</h1>
          {query && (
            <p className="text-slate-400 mt-2">
              Results for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
        
        {/* Search Form */}
        <form onSubmit={handleNewSearch} className="flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              className="h-10 w-full sm:w-80 rounded-lg border border-slate-700 bg-[#1e293b] pl-10 pr-4 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="Search sensors, tags, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Search Results */}
      <div className="bg-[#1e293b] rounded-lg border border-slate-700/30">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {query ? 'No results found' : 'Start searching'}
            </h3>
            <p className="text-slate-400">
              {query 
                ? `No sensors, tags, or notes match "${query}"`
                : 'Enter a search term to find your sensors, tags, and notes'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.url}
                className="block p-4 hover:bg-[#2d2e4a] transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white truncate">
                        {result.title}
                      </h3>
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 capitalize">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                      {result.description}
                    </p>
                    <div className="flex items-center text-xs text-slate-400">
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
        <div className="bg-blue-500/10 rounded-lg p-6 border border-blue-500/30">
          <h3 className="text-lg font-medium text-blue-100 mb-3">Search Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-200">
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
