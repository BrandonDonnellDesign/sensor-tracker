'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

import { EnhancedStatsCard } from '@/components/dashboard/enhanced-stats-card';
import { RecentSensors } from '@/components/dashboard/recent-sensors';
import { QuickActions } from '@/components/dashboard/quick-actions';

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
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
      {/* Header Section */}
      <div className='bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700'>
        <div className='px-6 py-6'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-slate-100'>
              Dashboard
            </h1>
            <p className='text-lg text-gray-600 dark:text-slate-400 mt-2'>
              Overview of your CGM sensor tracking
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='px-6 py-8 space-y-8'>
        {error && (
          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <svg
                  className='h-5 w-5 text-red-400'
                  viewBox='0 0 20 20'
                  fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800 dark:text-red-300'>
                  Error loading sensors
                </h3>
                <p className='text-sm text-red-700 dark:text-red-400 mt-1'>
                  {error}
                </p>
                <button
                  onClick={() => fetchSensors(true)}
                  className='text-sm text-red-800 dark:text-red-300 underline mt-2 hover:text-red-900 dark:hover:text-red-200'>
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          <EnhancedStatsCard
            title='Total Sensors'
            value={totalSensors}
            icon='sensors'
            color='blue'
            subtitle='All time'
            trend={
              sensorTrend !== 0
                ? {
                    value: Math.abs(sensorTrend),
                    isPositive: sensorTrend > 0,
                    label: 'vs last month',
                  }
                : undefined
            }
          />
          <EnhancedStatsCard
            title='Active Sensors'
            value={activeSensors}
            icon='check'
            color='green'
            subtitle='Currently working'
          />
          <EnhancedStatsCard
            title='Success Rate'
            value={`${Math.round(successRate)}%`}
            icon='trend'
            color='purple'
            subtitle='Overall performance'
            trend={{
              value: successRate,
              isPositive: successRate >= 90,
              label: 'reliability score',
            }}
          />
          <EnhancedStatsCard
            title='Issues'
            value={problematicSensors}
            icon='alert'
            color={problematicSensors > 0 ? 'red' : 'green'}
            subtitle='Need attention'
          />
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
          {/* Left Column - Current Sensor & Recent Sensors */}
          <div className='xl:col-span-2 space-y-6'>
            <RecentSensors
              sensors={recentSensors}
              onRefresh={() => fetchSensors(true)}
              isRefreshing={refreshing}
            />

            {/* Recent Activity & Trends */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div className='w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
                      Activity & Trends
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-slate-400'>
                      Recent patterns and insights
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-6'>
                {/* Monthly Trend */}
                <div className='flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800'>
                  <div>
                    <p className='text-sm font-medium text-blue-900 dark:text-blue-300'>
                      This Month
                    </p>
                    <p className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                      {thisMonthSensors}
                    </p>
                    <p className='text-xs text-blue-700 dark:text-blue-300'>
                      sensors added
                    </p>
                  </div>
                  <div className='text-right'>
                    {sensorTrend !== 0 && (
                      <div
                        className={`flex items-center text-xs font-medium ${
                          sensorTrend > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                        <svg
                          className={`w-3 h-3 mr-1 ${
                            sensorTrend > 0 ? '' : 'rotate-180'
                          }`}
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M7 17l9.2-9.2M17 17V7H7'
                          />
                        </svg>
                        {Math.abs(Math.round(sensorTrend))}%
                      </div>
                    )}
                    <p className='text-xs text-blue-600 dark:text-blue-400'>
                      vs last month
                    </p>
                  </div>
                </div>

                {/* Performance Insights */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50'>
                    <p className='text-lg font-bold text-gray-900 dark:text-slate-100'>
                      {sensors.length > 0
                        ? Math.round(
                            sensors.reduce((acc, sensor) => {
                              const model = sensor.sensor_models || {
                                duration_days: 10,
                              };
                              return acc + model.duration_days;
                            }, 0) / sensors.length
                          )
                        : 0}
                    </p>
                    <p className='text-xs text-gray-600 dark:text-slate-400'>
                      Avg. Duration (days)
                    </p>
                  </div>
                  <div className='text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50'>
                    <p className='text-lg font-bold text-gray-900 dark:text-slate-100'>
                      {sensors.length > 0
                        ? Math.round(
                            (sensors.filter((s) => !s.is_problematic).length /
                              sensors.length) *
                              100
                          )
                        : 0}
                      %
                    </p>
                    <p className='text-xs text-gray-600 dark:text-slate-400'>
                      Reliability Rate
                    </p>
                  </div>
                </div>

                {/* Most Used Brand */}
                {sensors.length > 0 && (
                  <div className='p-4 rounded-lg border border-gray-200 dark:border-slate-600'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-gray-900 dark:text-slate-100'>
                          Most Used Brand
                        </p>
                        <p className='text-lg font-bold text-indigo-600 dark:text-indigo-400'>
                          {(() => {
                            const brands = sensors.reduce((acc, sensor) => {
                              const brand =
                                sensor.sensor_models?.manufacturer || 'Unknown';
                              acc[brand] = (acc[brand] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            return (
                              Object.entries(brands).sort(
                                ([, a], [, b]) => b - a
                              )[0]?.[0] || 'None'
                            );
                          })()}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm text-gray-600 dark:text-slate-400'>
                          {(() => {
                            const brands = sensors.reduce((acc, sensor) => {
                              const brand =
                                sensor.sensor_models?.manufacturer || 'Unknown';
                              acc[brand] = (acc[brand] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            const topBrand = Object.entries(brands).sort(
                              ([, a], [, b]) => b - a
                            )[0];
                            return topBrand
                              ? `${topBrand[1]} sensors`
                              : '0 sensors';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Notifications */}
          <div className='space-y-6'>
            <QuickActions
              onRefresh={() => fetchSensors(true)}
              isRefreshing={refreshing}
            />

            {/* Sensor Health Summary */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                  <div className='w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center'>
                    <svg
                      className='w-5 h-5 text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
                      Sensor Health
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-slate-400'>
                      Current status overview
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                {/* Active Sensors Status */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    activeSensors > 0
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800'
                  }`}>
                  <div className='flex items-center space-x-3'>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activeSensors > 0 ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    <span
                      className={`text-sm font-medium ${
                        activeSensors > 0
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      Active Sensors
                    </span>
                  </div>
                  <span
                    className={`text-sm ${
                      activeSensors > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    {activeSensors} working
                  </span>
                </div>

                {/* Issues Status */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    problematicSensors > 0
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  }`}>
                  <div className='flex items-center space-x-3'>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        problematicSensors > 0 ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                    <span
                      className={`text-sm font-medium ${
                        problematicSensors > 0
                          ? 'text-red-800 dark:text-red-300'
                          : 'text-green-800 dark:text-green-300'
                      }`}>
                      Issues Detected
                    </span>
                  </div>
                  <span
                    className={`text-sm ${
                      problematicSensors > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                    {problematicSensors > 0
                      ? `${problematicSensors} sensors`
                      : 'All good'}
                  </span>
                </div>

                {/* Success Rate Status */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    successRate >= 90
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : successRate >= 70
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                  <div className='flex items-center space-x-3'>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        successRate >= 90
                          ? 'bg-green-500'
                          : successRate >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}></div>
                    <span
                      className={`text-sm font-medium ${
                        successRate >= 90
                          ? 'text-green-800 dark:text-green-300'
                          : successRate >= 70
                          ? 'text-yellow-800 dark:text-yellow-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}>
                      Success Rate
                    </span>
                  </div>
                  <span
                    className={`text-sm ${
                      successRate >= 90
                        ? 'text-green-600 dark:text-green-400'
                        : successRate >= 70
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                    {Math.round(successRate)}%
                  </span>
                </div>

                {/* Quick Action */}
                {(problematicSensors > 0 || activeSensors === 0) && (
                  <div className='pt-3 border-t border-gray-200 dark:border-slate-600'>
                    <Link
                      href={
                        problematicSensors > 0
                          ? '/dashboard/sensors?filter=problematic'
                          : '/dashboard/sensors/new'
                      }
                      className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'>
                      {problematicSensors > 0
                        ? 'View problem sensors →'
                        : 'Add your first sensor →'}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Insights */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4'>
                Quick Insights
              </h3>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-slate-400'>
                    Average Duration
                  </span>
                  <span className='text-sm font-medium text-gray-900 dark:text-slate-100'>
                    {sensors.length > 0 ? '9.2 days' : 'N/A'}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-slate-400'>
                    Most Used Brand
                  </span>
                  <span className='text-sm font-medium text-gray-900 dark:text-slate-100'>
                    {sensors.length > 0 ? 'Dexcom' : 'N/A'}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-slate-400'>
                    Replacement Rate
                  </span>
                  <span className='text-sm font-medium text-gray-900 dark:text-slate-100'>
                    {problematicSensors > 0 && totalSensors > 0
                      ? `${Math.round(
                          (problematicSensors / totalSensors) * 100
                        )}%`
                      : '0%'}
                  </span>
                </div>
                <div className='pt-3 border-t border-gray-200 dark:border-slate-600'>
                  <Link
                    href='/dashboard/analytics'
                    className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'>
                    View detailed analytics →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
