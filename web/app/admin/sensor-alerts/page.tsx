'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  BarChart3, 
  Users, 
  Bell,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface AlertStats {
  totalAlerts: number;
  alertsByType: Record<string, number>;
  deliveryRate: number;
}

interface SensorSummary {
  totalSensors: number;
  expiring3Days: number;
  expiring1Day: number;
  expiringToday: number;
  expired: number;
}

export default function SensorAlertsAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [sensorSummary, setSensorSummary] = useState<SensorSummary | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAlertStats(),
        fetchSensorSummary(),
        fetchRecentAlerts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    try {
      const response = await fetch(`/api/notifications/sensor-expiration?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlertStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching alert stats:', error);
    }
  };

  const fetchSensorSummary = async () => {
    try {
      const supabase = createClient();
      const { data: sensors, error } = await supabase
        .from('sensors')
        .select(`
          id,
          date_added,
          is_deleted,
          archived_at,
          sensor_models (duration_days)
        `)
        .eq('is_deleted', false)
        .is('archived_at', null);

      if (error) throw error;

      const now = new Date();
      const summary: SensorSummary = {
        totalSensors: sensors?.length || 0,
        expiring3Days: 0,
        expiring1Day: 0,
        expiringToday: 0,
        expired: 0
      };

      sensors?.forEach(sensor => {
        const durationDays = sensor.sensor_models?.duration_days || 14;
        const expiryDate = new Date(sensor.date_added);
        expiryDate.setDate(expiryDate.getDate() + durationDays);
        
        const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) {
          summary.expired++;
        } else if (daysLeft === 0) {
          summary.expiringToday++;
        } else if (daysLeft === 1) {
          summary.expiring1Day++;
        } else if (daysLeft <= 3) {
          summary.expiring3Days++;
        }
      });

      setSensorSummary(summary);
    } catch (error) {
      console.error('Error fetching sensor summary:', error);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      const supabase = createClient();
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          type,
          created_at,
          read,
          profiles (full_name, username)
        `)
        .in('type', ['sensor_expiry_warning', 'sensor_expired', 'sensor_grace_period'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAlerts(notifications || []);
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
    }
  };

  const getAuthToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const generateAlerts = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/notifications/sensor-expiration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Generated ${result.data.alertsGenerated} alerts for ${result.data.sensorsChecked} sensors`);
        await fetchData(); // Refresh data
      } else {
        throw new Error('Failed to generate alerts');
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
      alert('Error generating alerts: ' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'sensor_expiry_warning': 'Expiry Warning',
      'sensor_expired': 'Sensor Expired',
      'sensor_grace_period': 'Grace Period'
    };
    return labels[type] || type;
  };

  const getStatusColor = (read: boolean) => {
    return read 
      ? 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
      : 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                Sensor Expiration Alerts
              </h1>
              <p className="text-gray-600 dark:text-slate-400">
                Monitor and manage automated sensor expiration notifications
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                onClick={generateAlerts}
                disabled={generating}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Generate Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Sensor Summary Cards */}
        {sensorSummary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {sensorSummary.totalSensors}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Total Active</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {sensorSummary.expiring3Days}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">3 Days</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {sensorSummary.expiring1Day}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">1 Day</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {sensorSummary.expiringToday}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Today</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {sensorSummary.expired}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Expired</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Statistics */}
        {alertStats && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Alert Statistics ({timeRange})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {alertStats.totalAlerts}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Total Alerts Sent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {alertStats.deliveryRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Delivery Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {Object.keys(alertStats.alertsByType).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Alert Types</div>
              </div>
            </div>

            {Object.keys(alertStats.alertsByType).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">
                  Alerts by Type:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(alertStats.alertsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                      <span className="text-sm text-gray-600 dark:text-slate-400">
                        {getAlertTypeLabel(type)}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Recent Alerts
          </h2>
          
          {recentAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-slate-400">No recent alerts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {alert.title}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.read)}`}>
                        {alert.read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-slate-500">
                      <span>User: {alert.profiles?.full_name || alert.profiles?.username || 'Unknown'}</span>
                      <span>Type: {getAlertTypeLabel(alert.type)}</span>
                      <span>Sent: {new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}