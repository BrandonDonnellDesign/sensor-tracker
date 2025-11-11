'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import SensorExpirationAlerts from '@/components/notifications/sensor-expiration-alerts';
import { useAuth } from '@/components/providers/auth-provider';

interface SensorExpirationWidgetProps {
  className?: string;
}

export default function SensorExpirationWidget({ className = '' }: SensorExpirationWidgetProps) {
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSensors();
    }
  }, [user]);

  const fetchSensors = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sensors');
      if (!response.ok) {
        throw new Error('Failed to fetch sensors');
      }

      const data = await response.json();
      setSensors(data.sensors || []);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Error fetching sensors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sensors');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSensors();
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Sensor Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Monitor sensor expiration alerts
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh sensor data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && !sensors.length ? (
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <SensorExpirationAlerts sensors={sensors} />
            
            {/* Last Updated */}
            {lastChecked && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
                  </div>
                  <span>{sensors.length} sensor{sensors.length === 1 ? '' : 's'} monitored</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.href = '/sensors'}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Manage Sensors
          </button>
          <button
            onClick={() => window.location.href = '/sensors/add'}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Add Sensor
          </button>
        </div>
      </div>
    </div>
  );
}