'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';
import { getSensorExpirationInfo, formatDaysLeft } from '@/utils/sensor-expiration';
import { useDateTimeFormatter } from '@/utils/date-formatter';
import { TagDisplay } from '@/components/sensors/tag-display';
import { ArchivedSensorsView } from '@/components/sensors/archived-sensors-view';
import { checkAndTagExpiredSensors } from '@/lib/expired-sensors';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensorModel?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
  sensor_tags?: Array<{
    id: string;
    tag_id: string;
    tags: {
      id: string;
      name: string;
      category: string;
      description?: string;
      color: string;
      created_at: string;
    };
  }>;
};

export default function SensorsPage() {
  const { user } = useAuth();
  const dateFormatter = useDateTimeFormatter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingSensorId, setDeletingSensorId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<'date_added' | 'serial_number'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Default to newest first for date_added
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [userTimezone, setUserTimezone] = useState<string>('UTC'); // Default to UTC
  const [showArchivedView, setShowArchivedView] = useState(false);

  const fetchSensors = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      
      // Check for expired sensors and auto-tag them before fetching
      try {
        const result = await checkAndTagExpiredSensors();
        if (result.success && result.expiredCount > 0) {
          // Auto-tagged expired sensors successfully
        }
      } catch (expiredError) {
        console.warn('Error auto-tagging expired sensors:', expiredError);
        // Don't fail the whole operation if auto-tagging fails
      }
      
      let query = (supabase as any)
        .from('sensors')
        .select(`
          *,
          sensorModel:sensor_models(*),
          sensor_tags(
            id,
            tag_id,
            tags(
              id,
              name,
              category,
              description,
              color,
              created_at
            )
          )
        `)
        .eq('user_id', user.id)
        .is('archived_at', null) // Exclude archived sensors
        .order('created_at', { ascending: false });

      // Apply filter if specified
      if (filter === 'problematic') {
        query = query.eq('is_problematic', true);
      }
      if (!showDeleted) {
        query = query.eq('is_deleted', false);
      } else {
        query = query.eq('is_deleted', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSensors(data || []);
    } catch (error) {
      console.error('Error fetching sensors:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sensors');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter, showDeleted]);

  const fetchAvailableTags = useCallback(async () => {
    try {
      const { data: tags, error } = await (supabase as any)
        .from('tags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tags:', error);
      } else {
        setAvailableTags(tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, []);

  // Fetch user timezone
  const fetchUserTimezone = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.warn('Error fetching user timezone:', error);
        return;
      }
      
      if (profile?.timezone) {
        setUserTimezone(profile.timezone);
      }
    } catch (error) {
      console.warn('Error fetching user timezone:', error);
    }
  }, [user?.id]);

  // Create timezone-aware date formatter
  const formatDateTime = useCallback((dateInput: string | Date) => {
    try {
      // Handle both string and Date inputs
      let date: Date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        // Handle PostgreSQL timestamp format (e.g., "2025-10-01 16:17:41.032119+00")
        if (dateInput.includes('+') && !dateInput.includes('T')) {
          // Convert PostgreSQL format to ISO format
          const isoString = dateInput.replace(' ', 'T').replace(/\+(\d{2})$/, '+$1:00');
          date = new Date(isoString);
        } else {
          // Try parsing as-is
          date = new Date(dateInput);
        }
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date, returning original:', dateInput);
        return String(dateInput); // Fallback to original string
      }

      // Use a safer timezone approach
      try {
        const formatted = date.toLocaleString('en-US', {
          timeZone: userTimezone,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return formatted;
      } catch (timezoneError) {
        console.warn('Timezone error, falling back to UTC:', userTimezone, timezoneError);
        // Fallback to UTC if timezone is invalid
        const utcFormatted = date.toLocaleString('en-US', {
          timeZone: 'UTC',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return utcFormatted;
      }
    } catch (error) {
      console.warn('Error formatting date:', dateInput, error);
      return String(dateInput); // Fallback to original string
    }
  }, [userTimezone]);

  useEffect(() => {
    if (user) {
      fetchSensors();
    }
  }, [user, fetchSensors]);

  // Fetch tags once when component mounts and user is available
  useEffect(() => {
    if (user) {
      fetchAvailableTags();
    }
  }, [user, fetchAvailableTags]);

  // Fetch user timezone when user changes
  useEffect(() => {
    if (user) {
      fetchUserTimezone();
    }
  }, [user, fetchUserTimezone]);

  const deleteSensor = async (sensorId: string, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent navigation to sensor detail
    event.stopPropagation();
    
    if (!user?.id) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this sensor? This action cannot be undone.');
    if (!confirmed) return;
    
    if (!user?.id) return;
    setDeletingSensorId(sensorId);
    try {
      // Delete related notifications first
      await (supabase as any)
        .from('notifications')
        .delete()
        .eq('sensor_id', sensorId)
        .eq('user_id', user.id);
      // Soft delete by setting is_deleted to true
      const { error } = await supabase
        .from('sensors')
        .update({ is_deleted: true })
        .eq('id', sensorId)
        .eq('user_id', user.id);

      if (error) throw error;
      // Remove sensor from local state
      setSensors(sensors.filter(s => s.id !== sensorId));
    } catch (error) {
      console.error('Error deleting sensor:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete sensor');
    } finally {
      setDeletingSensorId(null);
    }
  };

  const restoreSensor = async (sensorId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('sensors')
        .update({ is_deleted: false })
        .eq('id', sensorId)
        .eq('user_id', user.id);
      if (error) throw error;
      fetchSensors();
    } catch (error) {
      console.error('Error restoring sensor:', error);
      setError(error instanceof Error ? error.message : 'Failed to restore sensor');
    }
  };

  const permanentlyDeleteSensor = async (sensorId: string) => {
    if (!user?.id) return;
    if (!window.confirm('This will permanently delete the sensor and all related data. This cannot be undone. Proceed?')) return;
    setDeletingSensorId(sensorId);
    try {
      // Delete notifications
      await (supabase as any)
        .from('notifications')
        .delete()
        .eq('sensor_id', sensorId)
        .eq('user_id', user.id);
      // Delete photos
      await (supabase as any)
        .from('sensor_photos')
        .delete()
        .eq('sensor_id', sensorId)
        .eq('user_id', user.id);
      // Permanently delete sensor
      const { error } = await supabase
        .from('sensors')
        .delete()
        .eq('id', sensorId)
        .eq('user_id', user.id);
      if (error) throw error;
      fetchSensors();
    } catch (error) {
      console.error('Error permanently deleting sensor:', error);
      setError(error instanceof Error ? error.message : 'Failed to permanently delete sensor');
    } finally {
      setDeletingSensorId(null);
    }
  };

  const filteredSensors = sensors
    .filter(sensor => {
      // Text search
      const matchesSearch = sensor.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sensor.lot_number && sensor.lot_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sensor.sensor_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Tag filter
      const matchesTags = selectedTags.length === 0 || 
        (sensor.sensor_tags && sensor.sensor_tags.some(st => selectedTags.includes(st.tag_id)));
      
      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date_added') {
        const dateA = new Date(a.date_added).getTime();
        const dateB = new Date(b.date_added).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'serial_number') {
        comparison = a.serial_number.localeCompare(b.serial_number);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
            {filter === 'problematic' ? 'Problematic Sensors' : 'My Sensors'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
            {filter === 'problematic' 
              ? 'Sensors that have been marked as having issues'
              : 'All your tracked CGM sensors'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowArchivedView(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14l-1.5 9H6.5L5 8zm0 0V6a2 2 0 012-2h10a2 2 0 012 2v2" />
            </svg>
            <span>Archived</span>
          </button>
          <Link
            href="/dashboard/sensors/new"
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add New Sensor</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-base font-semibold text-red-800 dark:text-red-200">Error loading sensors</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <button 
                onClick={fetchSensors}
                className="text-sm text-red-800 dark:text-red-200 underline mt-3 hover:text-red-900 dark:hover:text-red-100 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by serial number, lot number, or sensor type..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-0 focus:ring-3 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date_added' | 'serial_number')}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm focus:outline-0 focus:ring-3 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="date_added">Date Added</option>
                <option value="serial_number">Serial Number</option>
              </select>
            </div>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? (
                <svg className="w-4 h-4 text-gray-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Filter Controls */}
          <div className="flex gap-3 items-center flex-wrap">
            <Link
              href="/dashboard/sensors"
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                !filter 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              All Sensors
            </Link>
            <Link
              href="/dashboard/sensors?filter=problematic"
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === 'problematic' 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Problematic
            </Link>
            <button
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${showDeleted ? 'bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg shadow-gray-500/25' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
              onClick={() => setShowDeleted((v) => !v)}
            >
              {showDeleted ? 'Show Active' : 'Show Deleted'}
            </button>
          </div>
        </div>
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Filter by Tags</h3>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag.id) 
                      ? prev.filter(id => id !== tag.id)
                      : [...prev, tag.id]
                  );
                }}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedTags.includes(tag.id)
                    ? 'ring-3 ring-offset-2 ring-blue-500 dark:ring-offset-slate-800'
                    : 'hover:ring-3 hover:ring-offset-2 hover:ring-gray-300 dark:hover:ring-offset-slate-800'
                }`}
                style={{ 
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                  color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                  border: `2px solid ${tag.color}`
                }}
              >
                {tag.name}
                {selectedTags.includes(tag.id) && (
                  <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sensors List */}
      {filteredSensors.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-xs border border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {searchTerm ? 'No sensors found' : 'No sensors yet'}
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            {searchTerm 
              ? 'Try adjusting your search terms to find the sensors you\'re looking for'
              : filter === 'problematic' 
                ? 'Great news! You don\'t have any problematic sensors'
                : 'Get started by adding your first CGM sensor to begin tracking'
            }
          </p>
          {!searchTerm && (
            <Link href="/dashboard/sensors/new" className="btn-primary inline-flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Your First Sensor</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSensors.map((sensor) => {
            // Get model info (prefer sensorModel, fallback to sensor_type)
            // Normalize model to always match SensorModel interface
            let model: {
              id: string;
              manufacturer: string;
              modelName: string;
              duration_days: number;
              isActive: boolean;
              createdAt: Date;
              updatedAt: Date;
            };
            if (sensor.sensorModel && typeof sensor.sensorModel === 'object') {
              model = {
                id: sensor.id || 'fallback',
                manufacturer: sensor.sensorModel.manufacturer || (sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott'),
                modelName: sensor.sensorModel.model_name || (sensor.sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre'),
                duration_days: typeof sensor.sensorModel.duration_days === 'number' ? sensor.sensorModel.duration_days : (sensor.sensor_type === 'dexcom' ? 10 : 14),
                isActive: true,
                createdAt: new Date(sensor.date_added),
                updatedAt: new Date(sensor.date_added),
              };
            } else {
              model = {
                id: sensor.id || 'fallback',
                manufacturer: sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott',
                modelName: sensor.sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre',
                duration_days: sensor.sensor_type === 'dexcom' ? 10 : 14,
                isActive: true,
                createdAt: new Date(sensor.date_added),
                updatedAt: new Date(sensor.date_added),
              };
            }
            const expirationInfo = getSensorExpirationInfo(sensor.date_added, model);
            let badgeColor = '';
            let badgeLabel = '';
            if (expirationInfo.isExpired) {
              badgeColor = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
              badgeLabel = '❌ Expired';
            } else if (expirationInfo.isExpiringSoon) {
              badgeColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
              badgeLabel = '⚠️ Expiring soon';
            } else {
              badgeColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
              badgeLabel = '✅ Active';
            }
            return (
              <div key={sensor.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/sensors/${sensor.id}`}
                    className="flex items-center space-x-4 flex-1 cursor-pointer group"
                  >
                    <div className={`w-3 h-3 rounded-full ${sensor.is_problematic ? 'bg-red-400' : 'bg-green-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {sensor.serial_number}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>{badgeLabel}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-700 dark:text-slate-300 mb-1">
                        <span className="font-semibold">Model:</span> {model.modelName}
                        <span className="font-semibold">Manufacturer:</span> {model.manufacturer}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-700 dark:text-slate-300 mb-1">
                        <span className="font-semibold">Expires:</span> {formatDateTime(expirationInfo.expirationDate.toISOString())}
                        <span className="font-semibold">Days left:</span> {formatDaysLeft(expirationInfo.daysLeft, expirationInfo)}
                      </div>
                      {sensor.lot_number && (
                        <p className="text-sm text-gray-500 dark:text-slate-400">Lot: {sensor.lot_number}</p>
                      )}
                      {sensor.issue_notes && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 line-clamp-2">{sensor.issue_notes}</p>
                      )}
                      {sensor.sensor_tags && sensor.sensor_tags.length > 0 && (
                        <div className="mt-2">
                          <TagDisplay 
                            tags={sensor.sensor_tags.map(st => st.tags).filter(Boolean)}
                            size="sm"
                          />
                        </div>
                      )}
                      {sensor.is_deleted && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">Deleted</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Added {formatDateTime(sensor.date_added)}
                      </p>
                      {sensor.is_problematic && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 mt-2">
                          Problematic
                        </span>
                      )}
                    </div>
                    {!sensor.is_deleted ? (
                      <button
                        onClick={(e) => deleteSensor(sensor.id, e)}
                        disabled={deletingSensorId === sensor.id}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete sensor"
                      >
                        {deletingSensorId === sensor.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            restoreSensor(sensor.id);
                          }}
                          className="text-gray-400 hover:text-green-500 transition-colors p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Restore sensor"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            permanentlyDeleteSensor(sensor.id);
                          }}
                          disabled={deletingSensorId === sensor.id}
                          className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Permanently delete sensor"
                        >
                          {deletingSensorId === sensor.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived Sensors Modal */}
      <ArchivedSensorsView
        isOpen={showArchivedView}
        onClose={() => setShowArchivedView(false)}
      />
    </div>
  );
}