'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensorModel?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

export default function SensorsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingSensorId, setDeletingSensorId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchSensors = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      let query = (supabase as any)
        .from('sensors')
        .select(`
          *,
          sensorModel:sensor_models(*)
        `)
        .eq('user_id', user.id)
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

  useEffect(() => {
    if (user) {
      fetchSensors();
    }
  }, [user, fetchSensors]);

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

  const filteredSensors = sensors.filter(sensor => 
    sensor.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sensor.lot_number && sensor.lot_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    sensor.sensor_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

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
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by serial number, lot number, or sensor type..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 items-center">
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

      {/* Sensors List */}
      {filteredSensors.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-200 dark:border-slate-700">
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
          {filteredSensors.map((sensor) => (
            <div key={sensor.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200">
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sensor.sensorModel 
                          ? (sensor.sensorModel.manufacturer === 'Dexcom' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300')
                          : (sensor.sensor_type === 'dexcom' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300')
                      }`}>
                        {sensor.sensorModel 
                          ? sensor.sensorModel.manufacturer 
                          : (sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Freestyle')
                        }
                      </span>
                    </div>
                    {sensor.lot_number && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">Lot: {sensor.lot_number}</p>
                    )}
                    {sensor.issue_notes && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1 line-clamp-2">{sensor.issue_notes}</p>
                    )}
                    {sensor.is_deleted && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">Deleted</p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Added {formatDate(sensor.date_added)}
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
                      className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <>
                      <button
                        onClick={() => restoreSensor(sensor.id)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                        title="Restore sensor"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10v6a2 2 0 002 2h6m10-10v6a2 2 0 01-2 2h-6M7 7l10 10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => permanentlyDeleteSensor(sensor.id)}
                        disabled={deletingSensorId === sensor.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete permanently"
                      >
                        {deletingSensorId === sensor.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}