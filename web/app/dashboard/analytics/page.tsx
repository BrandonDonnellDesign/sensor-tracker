'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { Database } from '@/lib/database.types';
import { getSensorExpirationInfo } from '@/utils/sensor-expiration';

type Sensor = Database['public']['Tables']['sensors']['Row'] & {
  sensorModel?: {
    manufacturer: string;
    model_name: string;
    duration_days: number;
  };
  sensor_tags?: Array<{
    id: string;
    tag_id: string;
    tags: {
      id: string;
      name: string;
      category: string;
      description?: string;
      color: string;
      created_at: string;
    };
  }>;
};

interface AnalyticsData {
  averageWearDuration: number;
  failureRate: number;
  averageDaysBetweenReplacements: number;
  totalSensors: number;
  activeSensors: number;
  expiredSensors: number;
  problematicSensors: number;
  completedSensors: number; // Number of sensors used in wear duration calculation
  expectedDuration: number; // Average expected duration based on user's sensor types
  mostCommonSensorType: string; // Most common sensor type for display
  tagStats: Array<{
    tag: {
      id: string;
      name: string;
      category: string;
      color: string;
    };
    count: number;
    percentage: number;
  }>;
  categoryStats: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      
      // Fetch sensors and sensor models in parallel for better performance
      const [sensorsResult, tagsResult] = await Promise.all([
        (supabase as any)
          .from('sensors')
          .select(`
            *,
            sensorModel:sensor_models(*)
          `)
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .is('archived_at', null)
          .order('date_added', { ascending: true }),
        
        // Fetch tags separately to avoid nested query slowdown
        (supabase as any)
          .from('sensor_tags')
          .select(`
            id,
            sensor_id,
            tag_id,
            tags(
              id,
              name,
              category,
              color
            )
          `)
          .in('sensor_id', []) // Will be populated after we get sensor IDs
      ]);

      if (sensorsResult.error) throw sensorsResult.error;
      
      const sensorsData = sensorsResult.data || [];
      
      // If we have sensors, fetch their tags
      if (sensorsData.length > 0) {
        const sensorIds = sensorsData.map((s: any) => s.id);
        const { data: tagsData, error: tagsError } = await (supabase as any)
          .from('sensor_tags')
          .select(`
            id,
            sensor_id,
            tag_id,
            tags(
              id,
              name,
              category,
              color
            )
          `)
          .in('sensor_id', sensorIds);
        
        if (!tagsError && tagsData) {
          // Map tags to sensors
          sensorsData.forEach((sensor: any) => {
            sensor.sensor_tags = tagsData.filter((tag: any) => tag.sensor_id === sensor.id);
          });
        }
      }
      
      setSensors(sensorsData);
      calculateAnalytics(sensorsData);
    } catch (error) {
      console.error('Error fetching sensors:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sensors');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchSensors();
    }
  }, [user, fetchSensors]);

  const calculateAnalytics = useCallback((sensorData: Sensor[]) => {
    if (sensorData.length === 0) {
      setAnalytics({
        averageWearDuration: 0,
        failureRate: 0,
        averageDaysBetweenReplacements: 0,
        totalSensors: 0,
        activeSensors: 0,
        expiredSensors: 0,
        problematicSensors: 0,
        completedSensors: 0,
        expectedDuration: 14,
        mostCommonSensorType: 'Mixed',
        tagStats: [],
        categoryStats: []
      });
      return;
    }

    const totalSensors = sensorData.length;
    const problematicSensors = sensorData.filter(s => s.is_problematic).length;
    
    const sensorTypeCounts: { [key: string]: { count: number; duration: number } } = {};
    let totalExpectedDuration = 0;
    let totalWearDuration = 0;
    let activeSensors = 0;
    let expiredSensors = 0;
    let prematureFailures = 0;
    let totalDaysBetween = 0;
    let replacementGaps = 0;
    const wearDurations: number[] = [];
    const tagCounts: { [tagId: string]: { tag: any; count: number } } = {};
    const categoryCounts: { [category: string]: number } = {};

    // Sort sensors once
    const sortedSensors = [...sensorData].sort((a, b) => 
      new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
    );

    // Single pass through sensors for all calculations
    sortedSensors.forEach((sensor, index) => {
      const model = sensor.sensorModel || {
        manufacturer: sensor.sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott',
        model_name: sensor.sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre',
        duration_days: sensor.sensor_type === 'dexcom' ? 10 : 14,
      };

      // Track sensor type distribution
      const sensorKey = `${model.manufacturer} ${model.model_name}`;
      if (!sensorTypeCounts[sensorKey]) {
        sensorTypeCounts[sensorKey] = { count: 0, duration: model.duration_days };
      }
      sensorTypeCounts[sensorKey].count++;
      totalExpectedDuration += model.duration_days;

      const expirationInfo = getSensorExpirationInfo(sensor.date_added, {
        id: sensor.id,
        manufacturer: model.manufacturer,
        modelName: model.model_name,
        duration_days: model.duration_days,
        isActive: true,
        createdAt: new Date(sensor.date_added),
        updatedAt: new Date(sensor.date_added),
      });

      const startDate = new Date(sensor.date_added);
      const now = new Date();
      
      // Determine the end date for this sensor
      let endDate: Date | null = null;
      let isCompleted = false;
      
      // Check if there's a next sensor to use as end date
      const nextSensor = sortedSensors[index + 1];
      if (nextSensor) {
        // Use the start date of the next sensor as the end date of this sensor
        endDate = new Date(nextSensor.date_added);
        isCompleted = true;
      } else {
        // This is the most recent sensor
        // Consider it completed only if it's been expired for more than 1 day
        const daysSinceExpiration = Math.floor((now.getTime() - expirationInfo.expirationDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceExpiration > 1) {
          // Use expiration date + 1 day as a reasonable end estimate
          endDate = new Date(expirationInfo.expirationDate);
          endDate.setDate(endDate.getDate() + 1);
          isCompleted = true;
        }
      }
      
      // Calculate actual wear duration for completed sensors
      if (isCompleted && endDate) {
        const actualWearDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Sanity check: ensure wear duration is reasonable (at least 1 day, max 30 days)
        if (actualWearDays >= 1 && actualWearDays <= 30) {
          wearDurations.push(actualWearDays);
          totalWearDuration += actualWearDays;
          
          // Check for premature failure (wore for less than 80% of expected duration)
          if (sensor.is_problematic || actualWearDays < model.duration_days * 0.8) {
            prematureFailures++;
          }
        }
      }
      
      // Check sensor status
      if (expirationInfo.isExpired) {
        expiredSensors++;
      } else {
        activeSensors++;
      }
      
      // Calculate tags in the same loop
      if (sensor.sensor_tags) {
        sensor.sensor_tags.forEach(sensorTag => {
          if (sensorTag.tags) {
            const tag = sensorTag.tags;
            if (!tagCounts[tag.id]) {
              tagCounts[tag.id] = { tag, count: 0 };
            }
            tagCounts[tag.id].count++;
            
            if (!categoryCounts[tag.category]) {
              categoryCounts[tag.category] = 0;
            }
            categoryCounts[tag.category]++;
          }
        });
      }
      
      // Calculate days between replacements in the same loop
      if (index > 0) {
        const currentDate = new Date(sensor.date_added);
        const previousDate = new Date(sortedSensors[index - 1].date_added);
        const daysBetween = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysBetween >= 1 && daysBetween <= 60) {
          totalDaysBetween += daysBetween;
          replacementGaps++;
        }
      }
    });

    // Calculate averages
    const averageWearDuration = wearDurations.length > 0 ? totalWearDuration / wearDurations.length : 0;
    const failureRate = wearDurations.length > 0 ? (prematureFailures / wearDurations.length) * 100 : 0;
    const averageDaysBetweenReplacements = replacementGaps > 0 ? totalDaysBetween / replacementGaps : 0;
    const expectedDuration = totalExpectedDuration / totalSensors;
    
    // Find most common sensor type
    let mostCommonSensorType = 'Mixed';
    let maxCount = 0;
    Object.entries(sensorTypeCounts).forEach(([type, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostCommonSensorType = type;
      }
    });
    
    if (Object.keys(sensorTypeCounts).length === 1) {
      mostCommonSensorType = Object.keys(sensorTypeCounts)[0];
    } else if (Object.keys(sensorTypeCounts).length > 1) {
      mostCommonSensorType = 'Mixed Types';
    }
    
    // Convert to arrays with percentages
    const tagStats = Object.values(tagCounts)
      .map(({ tag, count }) => ({
        tag: {
          id: tag.id,
          name: tag.name,
          category: tag.category,
          color: tag.color
        },
        count,
        percentage: (count / totalSensors) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    const categoryStats = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalSensors) * 100
      }))
      .sort((a, b) => b.count - a.count);

    setAnalytics({
      averageWearDuration,
      failureRate,
      averageDaysBetweenReplacements,
      totalSensors,
      activeSensors,
      expiredSensors,
      problematicSensors,
      completedSensors: wearDurations.length,
      expectedDuration: Math.round(expectedDuration),
      mostCommonSensorType,
      tagStats,
      categoryStats
    });
  }, []);

  const formatDuration = (days: number): string => {
    if (days === 0) return '0 days';
    if (days < 1) return `${Math.round(days * 24)} hours`;
    if (days === 1) return '1 day';
    return `${Math.round(days * 10) / 10} days`;
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 10) / 10}%`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <p className="text-slate-400 text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-base font-semibold text-red-800 dark:text-red-200">Error loading analytics</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            <button 
              onClick={fetchSensors}
              className="text-sm text-red-800 dark:text-red-200 underline mt-3 hover:text-red-900 dark:hover:text-red-100 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Sensor Analytics
          </h1>
          <p className="text-slate-400 mt-2">
            Track your sensor usage patterns and performance
          </p>
        </div>
      </div>

      {analytics && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-slate-400">Total Sensors</p>
                  <p className="text-2xl font-semibold text-white">{analytics.totalSensors}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-slate-400">Active Sensors</p>
                  <p className="text-2xl font-semibold text-white">{analytics.activeSensors}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-slate-400">Problematic</p>
                  <p className="text-2xl font-semibold text-white">{analytics.problematicSensors}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-slate-400">Expired</p>
                  <p className="text-2xl font-semibold text-white">{analytics.expiredSensors}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Average Wear Duration */}
            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Average Wear Duration</h3>
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {analytics.completedSensors > 0 ? formatDuration(analytics.averageWearDuration) : 'N/A'}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {analytics.completedSensors > 0 ? (
                    analytics.averageWearDuration >= (analytics.expectedDuration * 0.9) ? 'Excellent duration' : 
                    analytics.averageWearDuration >= (analytics.expectedDuration * 0.7) ? 'Good duration' : 'Consider checking placement'
                  ) : (
                    'Based on completed sensors only'
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {analytics.completedSensors} completed sensor{analytics.completedSensors !== 1 ? 's' : ''} analyzed
                </p>
              </div>
              {/* Simple progress bar */}
              {analytics.completedSensors > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>0 days</span>
                    <span>{analytics.expectedDuration} days ({analytics.mostCommonSensorType})</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((analytics.averageWearDuration / analytics.expectedDuration) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Failure Rate */}
            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Failure Rate</h3>
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {analytics.completedSensors > 0 ? formatPercentage(analytics.failureRate) : 'N/A'}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {analytics.completedSensors > 0 ? (
                    analytics.failureRate <= 10 ? 'Excellent performance' : 
                    analytics.failureRate <= 25 ? 'Good performance' : 'Consider placement or adhesive'
                  ) : (
                    'Based on completed sensors only'
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Premature failures out of {analytics.completedSensors} completed
                </p>
              </div>
              {/* Simple progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>0%</span>
                  <span>50%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      analytics.failureRate <= 10 ? 'bg-green-600' :
                      analytics.failureRate <= 25 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min((analytics.failureRate / 50) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Days Between Replacements */}
            <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Days Between Replacements</h3>
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{formatDuration(analytics.averageDaysBetweenReplacements)}</p>
                <p className="text-sm text-slate-400 mt-2">
                  {analytics.averageDaysBetweenReplacements >= (analytics.expectedDuration * 0.9) ? 'Consistent replacement schedule' : 
                   analytics.averageDaysBetweenReplacements >= (analytics.expectedDuration * 0.7) ? 'Good timing' : 'Frequent replacements'}
                </p>
              </div>
              {/* Simple progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>0 days</span>
                  <span>{analytics.expectedDuration} days</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((analytics.averageDaysBetweenReplacements / analytics.expectedDuration) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-blue-500/10 rounded-lg p-5 border border-blue-500/30">
            <h3 className="text-base font-semibold text-white mb-4">Insights & Recommendations</h3>
            <div className="space-y-3">
              {analytics.failureRate > 25 && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-300">
                    Your failure rate is higher than average. Consider checking sensor placement, skin preparation, or adhesive quality.
                  </p>
                </div>
              )}
              
              {analytics.averageWearDuration < (analytics.expectedDuration * 0.7) && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 text-yellow-500 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-300">
                    Sensors are not lasting as long as expected for {analytics.mostCommonSensorType} (avg {analytics.expectedDuration} days). Review your insertion technique and skin care routine.
                  </p>
                </div>
              )}
              
              {analytics.failureRate <= 10 && analytics.averageWearDuration >= (analytics.expectedDuration * 0.9) && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-300">
                    Excellent sensor management! Your sensors are lasting well with minimal failures.
                  </p>
                </div>
              )}

              {analytics.totalSensors < 3 && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 text-blue-500 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-300">
                    Add more sensors to get more accurate analytics and trends.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!analytics && !loading && (
        <div className="bg-[#1e293b] rounded-lg p-12 text-center border border-slate-700/30">
          <div className="w-16 h-16 mx-auto bg-slate-700 rounded-lg flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No sensor data available
          </h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Add some sensors to your account to start seeing analytics and insights about your usage patterns.
          </p>
          <Link href="/dashboard/sensors/new" className="btn-primary inline-flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Your First Sensor</span>
          </Link>
        </div>
      )}
    </div>
  );
}