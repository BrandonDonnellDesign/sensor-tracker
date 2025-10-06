'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  deliveryRate: number;
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    deliveryRate: 0,
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
        
        // Fetch notification stats (if notifications table exists)
        try {
          const { data: notifications } = await (supabase as any)
            .from('notifications')
            .select('*');
          
          if (notifications) {
            const total = notifications.length;
            const sent = notifications.filter((n: any) => n.status === 'sent').length;
            const pending = notifications.filter((n: any) => n.status === 'pending').length;
            const failed = notifications.filter((n: any) => n.status === 'failed').length;
            
            setStats({
              total,
              sent,
              pending,
              failed,
              deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 0,
            });
          }
        } catch (notifError) {
          // Notifications table might not exist yet
          console.log('Notifications table not found, using placeholder data');
        }
      } catch (error) {
        console.error('Admin access check failed:', error);
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
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Notification Dashboard</h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
          Monitor notification delivery and queue status
        </p>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Sent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.sent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Failed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Rate */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Delivery Performance</h2>
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Success Rate</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{stats.deliveryRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${stats.deliveryRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Notification Types (24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Sensor Expiring</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">8</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Sensor Expired</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">3</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Sensor Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">12</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Maintenance</div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Implementation Notes</h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-blue-200">
          <li>Add status field to notifications table (pending/sent/failed)</li>
          <li>Create retry mechanism for failed notifications</li>
          <li>Set up webhook endpoints for push notification delivery status</li>
          <li>Add notification templates and A/B testing capability</li>
        </ul>
      </div>
    </div>
  );
}