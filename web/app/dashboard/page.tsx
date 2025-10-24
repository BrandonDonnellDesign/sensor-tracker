'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { useGamification } from '@/components/providers/gamification-provider';

// New enhanced components
import { HeroSection } from '@/components/dashboard/hero-section';
import { EnhancedStatsGrid } from '@/components/dashboard/enhanced-stats-grid';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { QuickInsights } from '@/components/dashboard/quick-insights';
import { CompactGamification } from '@/components/dashboard/compact-gamification';
import { StreamlinedQuickActions } from '@/components/dashboard/streamlined-quick-actions';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';



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
  const { userAchievements } = useGamification();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Check for admin access errors from middleware
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'admin_required') {
      setAdminError('Admin access required. You do not have permission to access the admin panel.');
    } else if (errorParam === 'no_profile') {
      setAdminError('No profile found. Please create your profile or contact an administrator.');
    } else if (errorParam === 'auth_error') {
      setAdminError('Authentication error occurred while checking admin access.');
    } else if (errorParam === 'middleware_error') {
      setAdminError('System error occurred during access verification. Please try again.');
    }
    
    // Clear the error parameter from URL
    if (errorParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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

  // Calculate dashboard metrics
  const totalSensors = sensors.length;
  const problematicSensors = sensors.filter((s) => s.is_problematic).length;


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

  // Find current active sensor
  const currentSensor = sensors.find((s) => {
    const sensorModel = s.sensor_models || { duration_days: 10 };
    const expirationDate = new Date(s.date_added);
    expirationDate.setDate(
      expirationDate.getDate() + sensorModel.duration_days
    );
    return expirationDate > new Date() && !s.is_problematic;
  });

  // Prepare stats for enhanced grid
  const statsData = {
    totalSensors,
    activeSensors,
    successRate,
    problematicSensors,
    sensorTrend,
    lastMonthSensors,
    thisMonthSensors
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <div>
        {/* Admin Access Error */}
        {adminError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center mb-6">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Access Denied</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">{adminError}</p>
            <button
              onClick={() => setAdminError(null)}
              className="text-sm text-yellow-800 dark:text-yellow-300 underline hover:text-yellow-900 dark:hover:text-yellow-200">
              Dismiss
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center mb-6">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Error loading sensors</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={() => fetchSensors(true)}
              className="text-sm text-red-800 dark:text-red-300 underline hover:text-red-900 dark:hover:text-red-200">
              Try again
            </button>
          </div>
        )}

        {/* Hero Section */}
        <HeroSection 
          currentSensor={currentSensor}
          totalSensors={totalSensors}
        />

        {/* Enhanced Stats Grid */}
        <EnhancedStatsGrid stats={statsData} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Left Column - Activity & Insights */}
          <div className="lg:col-span-2 space-y-4">
            {/* Activity Timeline */}
            <ActivityTimeline 
              sensors={sensors}
              userAchievements={userAchievements || []}
            />

            {/* Quick Insights */}
            <QuickInsights sensors={sensors} />
          </div>

          {/* Right Column - Actions & Gamification */}
          <div className="space-y-4">
            {/* Compact Gamification */}
            <CompactGamification />

            {/* Streamlined Quick Actions */}
            <StreamlinedQuickActions 
              onRefresh={() => fetchSensors(true)}
              isRefreshing={refreshing}
              problematicCount={problematicSensors}
            />
          </div>
        </div>



        {/* Empty State for New Users */}
        {totalSensors === 0 && (
          <div className="bg-[#1e293b] rounded-lg p-12 border border-slate-700/30 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">
                Welcome to CGM Tracker!
              </h2>
              <p className="text-slate-400 mb-6 text-sm">
                Start tracking your continuous glucose monitor sensors to unlock powerful insights, 
                achievements, and optimize your CGM experience.
              </p>
              <div className="space-y-3">
                <Link
                  href="/dashboard/sensors/new"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Sensor
                </Link>
                <div className="text-xs text-slate-500">
                  Or press <kbd className="bg-slate-700 px-2 py-1 rounded text-xs">Alt+N</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
