'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, CheckCircle, RefreshCw, Play, BarChart3 } from 'lucide-react';

interface NotificationStats {
  totalAlerts: number;
  alertsByType: Record<string, number>;
  deliveryRate: number;
}

interface CronResult {
  success: boolean;
  message: string;
  details?: {
    sensorsChecked: number;
    alertsGenerated: number;
    duration: string;
    errors: string[];
    timestamp: string;
  };
}

export default function SensorNotificationsAdmin() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [cronResult, setCronResult] = useState<CronResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/sensor-expiration?action=stats&timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCronJob = async () => {
    try {
      setCronRunning(true);
      const response = await fetch('/api/cron/sensor-expiration-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      setCronResult(result);
      
      // Refresh stats after running cron
      setTimeout(fetchStats, 1000);
    } catch (error) {
      console.error('Error running cron job:', error);
      setCronResult({
        success: false,
        message: 'Failed to run cron job'
      });
    } finally {
      setCronRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Sensor Notification Management
                </h1>
                <p className="text-gray-600 dark:text-slate-400">
                  Monitor and manage sensor expiration notifications
                </p>
              </div>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats?.totalAlerts || 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Delivery Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats?.deliveryRate?.toFixed(1) || 0}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Time Range</p>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
                  className="mt-1 text-sm bg-transparent border-none text-gray-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Alert Types Breakdown */}
        {stats?.alertsByType && Object.keys(stats.alertsByType).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Alerts by Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.alertsByType).map(([type, count]) => (
                <div key={type} className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Cron Job Trigger */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Manual Sensor Check
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Manually trigger the sensor expiration check process
              </p>
            </div>
            <button
              onClick={runCronJob}
              disabled={cronRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <Play className={`w-4 h-4 ${cronRunning ? 'animate-spin' : ''}`} />
              <span>{cronRunning ? 'Running...' : 'Run Check'}</span>
            </button>
          </div>

          {/* Cron Result */}
          {cronResult && (
            <div className={`p-4 rounded-lg ${
              cronResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start space-x-3">
                {cronResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    cronResult.success 
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {cronResult.message}
                  </p>
                  
                  {cronResult.details && (
                    <div className="mt-2 text-sm space-y-1">
                      <div className={cronResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                        <span className="font-medium">Sensors Checked:</span> {cronResult.details.sensorsChecked}
                      </div>
                      <div className={cronResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                        <span className="font-medium">Alerts Generated:</span> {cronResult.details.alertsGenerated}
                      </div>
                      <div className={cronResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                        <span className="font-medium">Duration:</span> {cronResult.details.duration}
                      </div>
                      <div className={cronResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                        <span className="font-medium">Timestamp:</span> {new Date(cronResult.details.timestamp).toLocaleString()}
                      </div>
                      
                      {cronResult.details.errors.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium text-red-700 dark:text-red-300">Errors:</span>
                          <ul className="list-disc list-inside mt-1 text-red-600 dark:text-red-400">
                            {cronResult.details.errors.map((error, index) => (
                              <li key={index} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-slate-300">Cron Schedule:</span>
              <span className="ml-2 text-gray-600 dark:text-slate-400">Every 6 hours (0 */6 * * *)</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-slate-300">Alert Types:</span>
              <span className="ml-2 text-gray-600 dark:text-slate-400">Warning, Expired, Grace Period</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-slate-300">Grace Period:</span>
              <span className="ml-2 text-gray-600 dark:text-slate-400">12 hours (Dexcom only)</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-slate-300">Warning Triggers:</span>
              <span className="ml-2 text-gray-600 dark:text-slate-400">3 days, 1 day, day of expiration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}