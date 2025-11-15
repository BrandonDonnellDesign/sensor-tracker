'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { AdvancedAnalytics } from '@/components/dashboard/advanced-analytics';
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { FoodAnalytics } from '@/components/dashboard/food-analytics';
import { GlucoseFoodCorrelation } from '@/components/dashboard/glucose-food-correlation';
import { NutritionInsights } from '@/components/dashboard/nutrition-insights';
import DawnPhenomenonAnalysis from '@/components/analytics/dawn-phenomenon-analysis';
import { A1CEstimation } from '@/components/analytics/a1c-estimation';
import { TimeInRangeAnalysis } from '@/components/analytics/time-in-range-analysis';
import { AnalyticsOverview } from '@/components/analytics/analytics-overview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGamification } from '@/components/providers/gamification-provider';
import { Database } from '@/lib/database.types';
import { BarChart3, Target, Sunrise, UtensilsCrossed } from 'lucide-react';

type Sensor = Database['public']['Tables']['sensors']['Row'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { userStats, userAchievements } = useGamification();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSensors() {
      if (!user?.id) return;
      
      try {
        const supabase = createClient();
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
        setSensors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSensors();
  }, [user?.id]);

  // Prepare data for AI insights
  const insightData = {
    sensors,
    userAchievements: userAchievements || [],
    userStats
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sensors.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-3">
              No Analytics Available Yet
            </h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Start tracking your sensors to unlock powerful analytics and AI-powered insights about your CGM performance.
            </p>
            <a
              href="/dashboard/sensors/new"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Sensor
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Header */}
        <div className="mb-4 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Advanced Analytics
          </h1>
          <p className="text-sm lg:text-base text-gray-600 dark:text-slate-400">
            Discover patterns, trends, and insights from your sensor and nutrition data with AI-powered analysis.
          </p>
        </div>

        {/* Tabbed Analytics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="glucose" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Glucose Control</span>
              <span className="sm:hidden">Glucose</span>
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Sunrise className="h-4 w-4" />
              <span className="hidden sm:inline">Patterns</span>
              <span className="sm:hidden">Patterns</span>
            </TabsTrigger>
            <TabsTrigger value="food" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Food Impact</span>
              <span className="sm:hidden">Food</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="lg:col-span-3">
                <AnalyticsOverview />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <AIInsightsPanel data={insightData} />
              </div>
            </div>
          </TabsContent>

          {/* Glucose Control Tab */}
          <TabsContent value="glucose" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="lg:col-span-3 space-y-6">
                <TimeInRangeAnalysis />
                <A1CEstimation />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <AIInsightsPanel data={insightData} />
              </div>
            </div>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="lg:col-span-3 space-y-6">
                <DawnPhenomenonAnalysis />
                <AdvancedAnalytics sensors={sensors} />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <AIInsightsPanel data={insightData} />
                <NutritionInsights />
              </div>
            </div>
          </TabsContent>

          {/* Food Impact Tab */}
          <TabsContent value="food" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="lg:col-span-3 space-y-6">
                <GlucoseFoodCorrelation />
                <FoodAnalytics />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <AIInsightsPanel data={insightData} />
                <NutritionInsights />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Removed sidebar - now integrated into tabs */}
        <div className="hidden">
          {/* Keep for reference but hide */}

          {/* AI Insights Sidebar */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            <AIInsightsPanel data={insightData} />
            
            {/* Nutrition Insights */}
            <NutritionInsights />
            
            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Total Sensors:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">{sensors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Success Rate:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {sensors.length > 0 
                      ? `${(((sensors.length - sensors.filter(s => s.is_problematic).length) / sensors.length) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Problematic:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {sensors.filter(s => s.is_problematic).length}
                  </span>
                </div>
                {userStats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-slate-400">Current Level:</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{userStats.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-slate-400">Current Streak:</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{userStats.current_streak} days</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Explore More
              </h3>
              <div className="space-y-2">
                <a
                  href="/dashboard"
                  className="block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  ← Back to Dashboard
                </a>
                <a
                  href="/dashboard/food"
                  className="block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Food Logging
                </a>
                <a
                  href="/dashboard/sensors"
                  className="block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  View All Sensors
                </a>
                <a
                  href="/dashboard/sensors/new"
                  className="block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Add New Sensor
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}