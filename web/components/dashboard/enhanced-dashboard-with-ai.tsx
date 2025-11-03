'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useGamification } from '@/components/providers/gamification-provider';

// Import the new AI components
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { AdvancedAnalytics } from '@/components/dashboard/advanced-analytics';
import { useSmartNotifications } from '@/lib/notifications/smart-notifications';

// Existing components
import { EnhancedStatsGrid } from '@/components/dashboard/enhanced-stats-grid';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { CompactGamification } from '@/components/dashboard/compact-gamification';

import { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase-client';

type Sensor = Database['public']['Tables']['sensors']['Row'];

export function EnhancedDashboardWithAI() {
  const { user } = useAuth();
  const { userStats, userAchievements } = useGamification();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sensors
  useEffect(() => {
    async function fetchSensors() {
      if (!user?.id) return;
      
      const supabase = createClient();
      const { data } = await supabase
        .from('sensors')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      setSensors(data || []);
      setLoading(false);
    }

    fetchSensors();
  }, [user?.id]);

  // Prepare data for AI insights
  const insightData = {
    sensors,
    userAchievements: userAchievements || [],
    userStats
  };

  // Get smart notifications
  const { notifications, dismissNotification } = useSmartNotifications({
    sensors,
    userStats,
    currentTime: new Date()
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Smart Notifications Bar */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 ${
                notification.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                notification.type === 'alert' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
                notification.type === 'celebration' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                    {notification.message}
                  </p>
                  {notification.actionable && notification.action && (
                    <a
                      href={notification.action.url}
                      className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mt-2"
                    >
                      {notification.action.label} →
                    </a>
                  )}
                </div>
                {notification.dismissible && (
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Stats Grid */}
      <EnhancedStatsGrid stats={{
        totalSensors: sensors.length,
        activeSensors: sensors.filter(s => !s.is_problematic).length,
        successRate: sensors.length > 0 ? ((sensors.length - sensors.filter(s => s.is_problematic).length) / sensors.length) * 100 : 0,
        problematicSensors: sensors.filter(s => s.is_problematic).length,
        sensorTrend: 0,
        lastMonthSensors: 0,
        thisMonthSensors: 0
      }} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - AI Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insights Panel */}
          <AIInsightsPanel data={insightData} />
          
          {/* Advanced Analytics */}
          <AdvancedAnalytics sensors={sensors} />
          
          {/* Activity Timeline */}
          <ActivityTimeline 
            sensors={sensors}
            userAchievements={userAchievements || []}
          />
        </div>

        {/* Right Column - Gamification & Actions */}
        <div className="space-y-6">
          <CompactGamification />
          
          {/* Quick Actions based on AI insights */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Recommended Actions
            </h3>
            <div className="space-y-3">
              {notifications.filter(n => n.actionable).slice(0, 3).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">
                      Priority: {notification.priority}
                    </p>
                  </div>
                  {notification.action && (
                    <a
                      href={notification.action.url}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      {notification.action.label}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}