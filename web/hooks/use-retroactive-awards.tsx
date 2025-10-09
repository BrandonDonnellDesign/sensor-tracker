'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

interface RetroactiveResult {
  user_id: string;
  achievements_awarded: number;
  points_awarded: number;
}

interface RetroactiveResponse {
  success: boolean;
  results: RetroactiveResult[];
  summary: {
    usersProcessed: number;
    totalAchievements: number;
    totalPoints: number;
  };
  error?: string;
}

export function useRetroactiveAwards() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetroactiveResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAccess = async (): Promise<boolean> => {
    if (!user?.id) {
      setError('Not authenticated');
      return false;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile check error:', profileError);
        setError('Failed to verify admin access');
        return false;
      }

      if ((profile as any)?.role !== 'admin') {
        setError('Admin access required');
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Admin check error:', err);
      setError('Failed to verify admin access');
      return false;
    }
  };

  const awardAllUsers = async (): Promise<RetroactiveResponse | null> => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // Check admin access first
      const hasAccess = await checkAdminAccess();
      if (!hasAccess) {
        return null;
      }

      console.log('Calling retroactively_award_achievements for user:', user?.id);

      // Call the database function directly
      const { data, error } = await (supabase as any).rpc('retroactively_award_achievements');
      
      if (error) {
        console.error('Database function error:', error);
        throw error;
      }
      
      console.log('Retroactive awards result:', data);
      
      const results = data || [];
      const response: RetroactiveResponse = {
        success: true,
        results,
        summary: {
          usersProcessed: results.length,
          totalAchievements: results.reduce((sum: number, r: any) => sum + r.achievements_awarded, 0),
          totalPoints: results.reduce((sum: number, r: any) => sum + r.points_awarded, 0)
        }
      };

      setResults(results);
      return response;
    } catch (err: any) {
      console.error('Award all users error:', err);
      const errorMessage = err.message || 'Failed to award achievements';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const awardSpecificUser = async (userId: string): Promise<RetroactiveResponse | null> => {
    if (!userId.trim()) {
      setError('User ID is required');
      return null;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // Check admin access first
      const hasAccess = await checkAdminAccess();
      if (!hasAccess) {
        return null;
      }

      console.log('Calling award_achievements_for_user for:', userId);

      // Call the database function directly
      const { data, error } = await (supabase as any).rpc('award_achievements_for_user', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Database function error:', error);
        throw error;
      }
      
      console.log('Specific user award result:', data);
      
      const result = [{
        user_id: userId,
        achievements_awarded: data[0]?.achievements_awarded || 0,
        points_awarded: data[0]?.points_awarded || 0
      }];
      
      const response: RetroactiveResponse = {
        success: true,
        results: result,
        summary: {
          usersProcessed: 1,
          totalAchievements: result[0].achievements_awarded,
          totalPoints: result[0].points_awarded
        }
      };

      setResults(result);
      return response;
    } catch (err: any) {
      console.error('Award specific user error:', err);
      const errorMessage = err.message || 'Failed to award achievements';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getGamificationStats = async () => {
    try {
      // Check admin access first
      const hasAccess = await checkAdminAccess();
      if (!hasAccess) {
        return null;
      }

      // Get gamification overview stats
      const { data: stats, error: statsError } = await (supabase as any)
        .from('user_gamification_stats')
        .select(`
          user_id,
          total_points,
          level,
          current_streak,
          longest_streak,
          sensors_tracked,
          successful_sensors,
          achievements_earned
        `);

      if (statsError) {
        throw statsError;
      }

      const { data: achievementCounts, error: achievementError } = await (supabase as any)
        .from('user_achievements')
        .select('achievement_id, user_id');

      if (achievementError) {
        throw achievementError;
      }

      return {
        success: true,
        overview: {
          totalUsers: stats?.length || 0,
          totalPoints: stats?.reduce((sum: number, s: any) => sum + s.total_points, 0) || 0,
          totalAchievements: achievementCounts?.length || 0,
          averageLevel: stats?.length ? (stats.reduce((sum: number, s: any) => sum + s.level, 0) / stats.length).toFixed(1) : 0,
          highestStreak: Math.max(...(stats?.map((s: any) => s.longest_streak) || [0]))
        },
        users: stats || []
      };
    } catch (err: any) {
      console.error('Get gamification stats error:', err);
      setError(err.message || 'Failed to get stats');
      return null;
    }
  };

  return {
    loading,
    results,
    error,
    awardAllUsers,
    awardSpecificUser,
    getGamificationStats,
    clearResults: () => setResults([]),
    clearError: () => setError(null),
  };
}