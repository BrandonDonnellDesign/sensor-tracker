'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { StatsCard } from '@/components/dashboard/stats-card';

interface Profile {
  id: string;
  role: string;
  username: string;
  full_name: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSensors: 0,
    totalSensorModels: 0,
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.id) {
        router.push('/auth/login');
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !profile || (profile as any).role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);

        // Fetch admin stats
        const [usersResult, sensorsResult] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('sensors').select('id', { count: 'exact', head: true }),
        ]);

        // Try to get sensor models count, fallback to 0 if table doesn't exist
        let sensorModelsCount = 0;
        try {
          const sensorModelsResult = await (supabase as any).from('sensor_models').select('id', { count: 'exact', head: true });
          sensorModelsCount = sensorModelsResult.count || 0;
        } catch (error) {
          console.warn('Sensor models table not found, using 0 count');
        }

        setStats({
          totalUsers: usersResult.count || 0,
          totalSensors: sensorsResult.count || 0,
          totalSensorModels: sensorModelsCount,
        });
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">Manage users, sensors, and system settings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon="sensors"
          color="blue"
        />
        <StatsCard
          title="Total Sensors"
          value={stats.totalSensors}
          icon="check"
          color="green"
        />
        <StatsCard
          title="Sensor Models"
          value={stats.totalSensorModels}
          icon="calendar"
          color="purple"
        />
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/sensor-models"
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200 group"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sensor Models</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Manage sensor types and manufacturers</p>
            </div>
          </div>
          <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
            <span className="text-sm font-medium">Manage Models</span>
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}