'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Target,
  BarChart3,
  Trophy,
  Star,
  ChevronRight
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';

interface UserStats {
  successRate: number;
  averageDuration: number;
  totalSensors: number;
  currentStreak: number;
}

interface CommunityStats {
  averageSuccessRate: number;
  averageDuration: number;
  topPercentileSuccessRate: number;
  topPercentileDuration: number;
  totalUsers: number;
  totalSensors: number;
}

interface PerformanceComparisonProps {
  userStats: UserStats;
  className?: string;
}

export function PerformanceComparison({ userStats, className = '' }: PerformanceComparisonProps) {
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchCommunityStats();
  }, []);

  const fetchCommunityStats = async () => {
    try {
      const response = await authenticatedFetch('/api/community/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch community stats');
      }
      
      const data = await response.json();
      
      // Check if this is community engagement data vs sensor performance data
      if (data.totalTips !== undefined) {
        // This is community engagement data, convert to performance-like data for now
        setCommunityStats({
          averageSuccessRate: 85.5, // Mock sensor success rate
          averageDuration: 9.2, // Mock average sensor duration
          topPercentileSuccessRate: 95.8, // Mock top percentile success rate
          topPercentileDuration: 13.5, // Mock top percentile duration
          totalUsers: data.totalUsers || 0,
          totalSensors: data.totalTips || 0 // Use tips as a proxy for sensors for now
        });
      } else {
        // This is actual sensor performance data
        setCommunityStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch community stats:', error);
      // Fallback to basic stats if API fails
      setCommunityStats({
        averageSuccessRate: 0,
        averageDuration: 0,
        topPercentileSuccessRate: 0,
        topPercentileDuration: 0,
        totalUsers: 0,
        totalSensors: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceLevel = (userValue: number, communityAvg: number, topPercentile: number) => {
    if (userValue >= topPercentile * 0.95) return 'excellent';
    if (userValue >= communityAvg * 1.1) return 'above-average';
    if (userValue >= communityAvg * 0.9) return 'average';
    return 'below-average';
  };



  const getPerformanceLabel = (level: string) => {
    switch (level) {
      case 'excellent': return 'Excellent';
      case 'above-average': return 'Above Average';
      case 'average': return 'Average';
      default: return 'Needs Improvement';
    }
  };

  const getPercentile = (userValue: number, communityAvg: number, topPercentile: number) => {
    if (userValue >= topPercentile) return 95;
    if (userValue >= communityAvg * 1.2) return 85;
    if (userValue >= communityAvg * 1.1) return 75;
    if (userValue >= communityAvg) return 50;
    if (userValue >= communityAvg * 0.8) return 25;
    return 10;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
            <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!communityStats) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="text-center text-gray-500 dark:text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Community data unavailable</p>
        </div>
      </div>
    );
  }

  const successRateLevel = communityStats ? getPerformanceLevel(
    userStats.successRate, 
    communityStats.averageSuccessRate, 
    communityStats.topPercentileSuccessRate
  ) : 'average';

  const durationLevel = communityStats ? getPerformanceLevel(
    userStats.averageDuration, 
    communityStats.averageDuration, 
    communityStats.topPercentileDuration
  ) : 'average';

  const successRatePercentile = communityStats ? getPercentile(
    userStats.successRate,
    communityStats.averageSuccessRate,
    communityStats.topPercentileSuccessRate
  ) : 50;

  const durationPercentile = communityStats ? getPercentile(
    userStats.averageDuration,
    communityStats.averageDuration,
    communityStats.topPercentileDuration
  ) : 50;

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
              <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Community Comparison
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                See how you compare to {communityStats?.totalUsers?.toLocaleString() || '0'} other users
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Success Rate Comparison */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Success Rate
                </span>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                successRateLevel === 'excellent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                successRateLevel === 'above-average' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                successRateLevel === 'average' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {getPerformanceLabel(successRateLevel)}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {userStats.successRate.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {successRatePercentile}th percentile
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      successRateLevel === 'excellent' ? 'bg-green-500' :
                      successRateLevel === 'above-average' ? 'bg-blue-500' :
                      successRateLevel === 'average' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(userStats.successRate, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>Avg: {communityStats?.averageSuccessRate?.toFixed(1) || '0.0'}%</span>
                  <span>Top: {communityStats?.topPercentileSuccessRate?.toFixed(1) || '0.0'}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Comparison */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Avg Duration
                </span>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                durationLevel === 'excellent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                durationLevel === 'above-average' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                durationLevel === 'average' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {getPerformanceLabel(durationLevel)}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {userStats.averageDuration.toFixed(1)}d
                </span>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {durationPercentile}th percentile
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      durationLevel === 'excellent' ? 'bg-green-500' :
                      durationLevel === 'above-average' ? 'bg-blue-500' :
                      durationLevel === 'average' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((userStats.averageDuration / 14) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>Avg: {communityStats?.averageDuration?.toFixed(1) || '0.0'}d</span>
                  <span>Top: {communityStats?.topPercentileDuration?.toFixed(1) || '0.0'}d</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        {(successRateLevel === 'excellent' || durationLevel === 'excellent') && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Top Performer! 🎉
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You're in the top 10% of CGM users. Keep up the excellent work!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Stats (Expandable) */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <h4 className="font-medium text-gray-900 dark:text-slate-100">
              Community Insights
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {communityStats?.totalUsers?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Active Users
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {communityStats?.totalSensors?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Sensors Tracked
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {communityStats?.averageSuccessRate?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Avg Success Rate
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {communityStats?.averageDuration?.toFixed(1) || '0.0'}d
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Avg Duration
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Star className="w-4 h-4 inline mr-1" />
                All data is anonymized and aggregated to protect user privacy. 
                Your individual data is never shared.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}