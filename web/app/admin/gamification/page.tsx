'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/providers/admin-guard';
import { RetroactiveAwards } from '@/components/admin/retroactive-awards';
import { useGamification } from '@/components/providers/gamification-provider';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Star, TrendingUp } from 'lucide-react';

interface GamificationStats {
  totalUsers: number;
  totalPoints: number;
  totalAchievements: number;
  averageLevel: number;
  highestStreak: number;
  topUsers: Array<{
    user_id: string;
    total_points: number;
    level: number;
    achievements_earned: number;
    current_streak: number;
  }>;
}

export default function AdminGamificationPage() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGamificationStats = async () => {
      try {
        setError(null);
        
        // Get user stats
        const { data: userStats, error: statsError } = await (supabase as any)
          .from('user_gamification_stats')
          .select('*')
          .order('total_points', { ascending: false });

        if (statsError) throw statsError;

        // Get achievement counts (total earned achievements across all users)
        const { data: achievements, error: achievementError } = await (supabase as any)
          .from('user_achievements')
          .select('user_id');

        if (achievementError) throw achievementError;

        // Get total available achievements
        const { data: availableAchievements, error: availableError } = await (supabase as any)
          .from('achievements')
          .select('id')
          .eq('is_active', true);

        if (availableError) throw availableError;

        // Calculate stats
        const totalUsers = userStats?.length || 0;
        const totalPoints = userStats?.reduce((sum: number, s: any) => sum + (s.total_points || 0), 0) || 0;
        const totalAchievements = achievements?.length || 0;
        const averageLevel = totalUsers > 0 ? userStats.reduce((sum: number, s: any) => sum + (s.level || 1), 0) / totalUsers : 0;
        const highestStreak = totalUsers > 0 ? Math.max(...userStats.map((s: any) => s.longest_streak || 0)) : 0;
        const topUsers = userStats?.slice(0, 10) || [];

        setStats({
          totalUsers,
          totalPoints,
          totalAchievements,
          averageLevel,
          highestStreak,
          topUsers
        });
      } catch (err: any) {
        console.error('Error fetching gamification stats:', err);
        setError(err.message || 'Failed to load gamification stats');
      } finally {
        setLoading(false);
      }
    };

    fetchGamificationStats();
  }, []);

  if (loading) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Gamification Management</h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
            Manage user achievements, levels, and rewards system
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Achievements</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.totalAchievements}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Avg Level</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.averageLevel.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Best Streak</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.highestStreak}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">📊 System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Users with Stats</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalUsers || 0}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-300">Total Earned</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.totalAchievements || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-300">System Points</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.totalPoints || 0}</p>
            </div>
          </div>
          {stats?.totalUsers === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>No gamification data found.</strong> This could mean:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                <li>No users have added sensors yet</li>
                <li>The gamification system hasn&apos;t been triggered</li>
                <li>You may need to run retroactive awards to populate initial data</li>
              </ul>
            </div>
          )}
        </div>

        {/* Retroactive Awards Section */}
        <RetroactiveAwards />

        {/* Top Users Leaderboard */}
        {stats && stats.topUsers.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">🏆 Top Users</h3>
            <div className="space-y-3">
              {stats.topUsers.map((user, index) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        User {user.user_id.substring(0, 8)}...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Level {user.level} • {user.current_streak} day streak
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-slate-100">
                      {user.total_points.toLocaleString()} pts
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {user.achievements_earned} achievements
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}