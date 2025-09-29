'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentSensors } from '@/components/dashboard/recent-sensors';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      const { data, error } = await supabase
        .from('sensors')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSensors(data || []);
    } catch (error) {
      console.error('Error fetching sensors:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sensors');
      setSensors([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchSensors();
    } else {
      setLoading(false);
    }
  }, [user, fetchSensors]);

  const totalSensors = sensors.length;
  const problematicSensors = sensors.filter(s => s.is_problematic).length;
  const recentSensors = sensors.slice(0, 5);

  // Calculate this month's sensors
  const thisMonthSensors = sensors.filter(s => {
    const sensorDate = new Date(s.date_added);
    const now = new Date();
    return sensorDate.getMonth() === now.getMonth() && sensorDate.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">Overview of your CGM sensor tracking</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading sensors</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button 
                onClick={fetchSensors}
                className="text-sm text-red-800 underline mt-2 hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Sensors"
          value={totalSensors}
          icon="sensors"
          color="blue"
        />
        <StatsCard
          title="Problematic"
          value={problematicSensors}
          icon="alert"
          color="red"
        />
        <StatsCard
          title="Success Rate"
          value={totalSensors > 0 ? `${Math.round(((totalSensors - problematicSensors) / totalSensors) * 100)}%` : '0%'}
          icon="check"
          color="green"
        />
        <StatsCard
          title="This Month"
          value={thisMonthSensors}
          icon="calendar"
          color="purple"
        />
      </div>

      {/* Recent Sensors and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSensors sensors={recentSensors} onRefresh={fetchSensors} />
        <QuickActions />
      </div>
    </div>
  );
}