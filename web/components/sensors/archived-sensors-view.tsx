import { useState, useEffect, useCallback } from 'react';
import { Archive, Clock, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
// import { Database } from '@/lib/database.types';

type ArchivedSensor = any;

interface ArchivedSensorsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchivedSensorsView({ isOpen, onClose }: ArchivedSensorsViewProps) {
  const [archivedSensors, setArchivedSensors] = useState<ArchivedSensor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchArchivedSensors = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await (supabase as any)
        .from('sensors')
        .select('*')
        .eq('user_id', user.id)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setArchivedSensors(data || []);
    } catch (err) {
      console.error('Error fetching archived sensors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch archived sensors');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchArchivedSensors();
    }
  }, [isOpen, user?.id, fetchArchivedSensors]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)} hours`;
    if (days === 1) return '1 day';
    return `${Math.round(days * 10) / 10} days`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <Archive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Archived Sensors
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchArchivedSensors}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : archivedSensors.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-slate-400">
                No archived sensors found. Sensors are automatically archived 6 months after expiration.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedSensors.map((sensor) => (
                <div
                  key={sensor.id}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {sensor.sensor_type.toUpperCase()}
                        </span>
                        {sensor.is_problematic && (
                          <Tag className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        Serial: {sensor.serial_number}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      Archived: {formatDate(sensor.archived_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-slate-400">
                        Added: {formatDate(sensor.date_added)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-slate-400">
                        Worn: {sensor.days_worn ? formatDuration(sensor.days_worn) : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Archive className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-slate-400">
                        Reason: {sensor.archived_reason.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {sensor.notes_at_archival && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        <span className="font-medium">Archive Notes:</span> {sensor.notes_at_archival}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-slate-700">
          <div className="text-sm text-gray-600 dark:text-slate-400">
            {archivedSensors.length} archived sensor{archivedSensors.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}