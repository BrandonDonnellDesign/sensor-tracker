'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

import { EnhancedStatsCard } from '@/components/dashboard/enhanced-stats-card';
import { RecentSensors } from '@/components/dashboard/recent-sensors';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { GamificationWidget } from '@/components/gamification/gamification-widget';

import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensor_models?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;

      try {
        setError(null);
        if (isRefresh) {
          setRefreshing(true);
        }

        const { data, error } = await (supabase as any)
          .from('sensors')
          .select(
            `
          *,
          sensor_models (
            manufacturer,
            model_name,
            duration_days
          )
        `
          )
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .is('archived_at', null) // Exclude archived sensors
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSensors(data || []);
      } catch (error) {
        console.error('Error fetching sensors:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch sensors'
        );
        setSensors([]); // Set empty array on error
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (user) {
      fetchSensors();
    } else {
      setLoading(false);
    }
  }, [user, fetchSensors]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Alt + S for search (non-conflicting)
      if (
        event.altKey &&
        event.key === 's' &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        // Trigger search button click
        const searchButton = document.querySelector(
          '[data-search-trigger]'
        ) as HTMLButtonElement;
        if (searchButton) {
          searchButton.click();
        }
        return;
      }

      // Alt + N for new sensor (non-conflicting)
      if (
        event.altKey &&
        event.key === 'n' &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = '/dashboard/sensors/new';
        return;
      }

      // Alt + R for refresh (non-conflicting)
      if (
        event.altKey &&
        event.key === 'r' &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        fetchSensors(true);
        return;
      }

      // Alt + H for home/dashboard (non-conflicting)
      if (
        event.altKey &&
        event.key === 'h' &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = '/dashboard';
        return;
      }

      // G then S for sensors (Gmail-style shortcuts)
      if (
        event.key === 'g' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Set a timeout to wait for the next key
        const handleSecondKey = (secondEvent: KeyboardEvent) => {
          if (secondEvent.key === 's') {
            secondEvent.preventDefault();
            window.location.href = '/dashboard/sensors';
          }
          document.removeEventListener('keydown', handleSecondKey);
        };

        setTimeout(() => {
          document.addEventListener('keydown', handleSecondKey, { once: true });
        }, 0);

        // Remove the listener after 2 seconds if no second key is pressed
        setTimeout(() => {
          document.removeEventListener('keydown', handleSecondKey);
        }, 2000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fetchSensors]);

  const totalSensors = sensors.length;
  const problematicSensors = sensors.filter((s) => s.is_problematic).length;
  const recentSensors = sensors.slice(0, 5);

  // Calculate this month's sensors
  const thisMonthSensors = sensors.filter((s) => {
    const sensorDate = new Date(s.date_added);
    const now = new Date();
    return (
      sensorDate.getMonth() === now.getMonth() &&
      sensorDate.getFullYear() === now.getFullYear()
    );
  }).length;

  // Calculate last month's sensors for trend
  const lastMonthSensors = sensors.filter((s) => {
    const sensorDate = new Date(s.date_added);
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      sensorDate.getMonth() === lastMonth.getMonth() &&
      sensorDate.getFullYear() === lastMonth.getFullYear()
    );
  }).length;

  // Calculate trends
  const sensorTrend =
    lastMonthSensors > 0
      ? ((thisMonthSensors - lastMonthSensors) / lastMonthSensors) * 100
      : 0;
  const successRate =
    totalSensors > 0
      ? ((totalSensors - problematicSensors) / totalSensors) * 100
      : 0;

  // Calculate active sensors (not expired)
  const activeSensors = sensors.filter((s) => {
    const sensorModel = s.sensor_models || { duration_days: 10 };
    const expirationDate = new Date(s.date_added);
    expirationDate.setDate(
      expirationDate.getDate() + sensorModel.duration_days
    );
    return expirationDate > new Date() && !s.is_problematic;
  }).length;

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-2 py-4 max-w-7xl mx-auto">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Error loading sensors</h3>
          <p className="text-sm text-red-700 dark:text-red-400 mb-2">{error}</p>
          <button
            onClick={() => fetchSensors(true)}
            className="text-sm text-red-800 dark:text-red-300 underline hover:text-red-900 dark:hover:text-red-200">
            Try again
          </button>
        </div>
      )}

      {/* Main Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <EnhancedStatsCard
          title="Total Sensors"
          value={totalSensors}
          icon="sensors"
          color="blue"
          subtitle="All time"
        />
        <EnhancedStatsCard
          title="Active Sensors"
          value={activeSensors}
          icon="check"
          color="green"
          subtitle="Currently working"
        />
        <EnhancedStatsCard
          title="Success Rate"
          value={`${Math.round(successRate)}%`}
          icon="trend"
          color="purple"
          subtitle="Performance"
        />
        <EnhancedStatsCard
          title="Issues"
          value={problematicSensors}
          icon="alert"
          color={problematicSensors > 0 ? "red" : "green"}
          subtitle="Need attention"
        />
      </div>

      {/* Recent Sensors or Empty State */}
      <div className="mt-8">
        {totalSensors === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-slate-700 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Welcome to CGM Tracker!</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-md mx-auto">Start tracking your continuous glucose monitor sensors to get insights into their performance and reliability.</p>
            <Link
              href="/dashboard/sensors/new"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Sensor
            </Link>
          </div>
        ) : (
          <RecentSensors
            sensors={recentSensors}
            onRefresh={() => fetchSensors(true)}
            isRefreshing={refreshing}
          />
        )}
      </div>

      {/* Quick Actions & Gamification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <QuickActions onRefresh={() => fetchSensors(true)} isRefreshing={refreshing} />
        <GamificationWidget />
      </div>

      {/* Collapsible Insights Section */}
      <details className="mt-8 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <summary className="text-lg font-semibold text-gray-900 dark:text-slate-100 cursor-pointer">More Insights</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{sensors.length > 0 ? Math.round(sensors.reduce((acc, sensor) => { const model = sensor.sensor_models || { duration_days: 10 }; return acc + model.duration_days; }, 0) / sensors.length) : 0}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">Avg. Duration (days)</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{sensors.length > 0 ? Math.round((sensors.filter((s) => !s.is_problematic).length / sensors.length) * 100) : 0}%</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">Reliability Rate</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{(() => { const brands = sensors.reduce((acc, sensor) => { const brand = sensor.sensor_models?.manufacturer || 'Unknown'; acc[brand] = (acc[brand] || 0) + 1; return acc; }, {} as Record<string, number>); return (Object.entries(brands).sort(([, a], [, b]) => b - a)[0]?.[0] || 'None'); })()}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">Most Used Brand</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{problematicSensors > 0 && totalSensors > 0 ? `${Math.round((problematicSensors / totalSensors) * 100)}%` : '0%'}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">Replacement Rate</p>
          </div>
        </div>
        <div className="pt-4 text-right">
          <Link href="/dashboard/analytics" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">View detailed analytics →</Link>
        </div>
      </details>
    </div>
  );
}
