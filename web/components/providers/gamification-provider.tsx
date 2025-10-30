'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth-provider';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  badge_color: string;
  requirement_type: string;
  requirement_value: number;
  requirement_data: any;
  is_repeatable: boolean;
  is_active: boolean;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  progress_data: any;
  achievement: Achievement;
}

interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  sensors_tracked: number;
  successful_sensors: number;
  achievements_earned: number;
}

interface GamificationContextType {
  userStats: UserStats | null;
  userAchievements: UserAchievement[];
  allAchievements: Achievement[];
  loading: boolean;
  refreshStats: () => Promise<void>;
  recordActivity: (activity: string) => Promise<void>;
  recordLoginActivity: () => Promise<void>;
  checkAchievements: () => Promise<UserAchievement[]>;
  getLevel: (points: number) => number;
  getPointsForNextLevel: (currentLevel: number) => number;
  getProgressToNextLevel: (points: number, level: number) => number;
  showAchievementNotification: (achievement: Achievement) => void;
  achievementNotifications: Achievement[];
  clearAchievementNotification: (achievementId: string) => void;
  testHiddenAchievement: (achievementName: string) => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

// Level calculation: exponential growth
const calculateLevel = (points: number): number => {
  if (points < 100) return 1;
  return Math.floor(Math.log2(points / 100)) + 2;
};

const getPointsForLevel = (level: number): number => {
  if (level <= 1) return 0;  // Level 1 starts at 0 points
  return Math.pow(2, level - 2) * 100;  // Level 2 = 100, Level 3 = 200, Level 4 = 400, etc.
};

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievementNotifications, setAchievementNotifications] = useState<Achievement[]>([]);

  const fetchUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: stats, error: statsError } = await (supabase as any)
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Handle table not existing
      if (statsError?.message?.includes('relation "public.user_gamification_stats" does not exist')) {
        console.warn('Gamification tables not yet created. Run migrations to enable gamification features.');
        setUserStats(null);
        return;
      }

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching user stats:', statsError);
        // Create default stats if table exists but user has no record
        if (statsError.code === 'PGRST301' || !statsError.message?.includes('relation')) {
          try {
            const { data: newStats, error: createError } = await (supabase as any)
              .from('user_gamification_stats')
              .insert({
                user_id: user.id,
                total_points: 0,
                level: 1,
                current_streak: 0,
                longest_streak: 0,
                achievements_earned: 0
              })
              .select()
              .single();
            
            if (!createError && newStats) {
              setUserStats(newStats);
            }
          } catch (createErr) {
            console.warn('Could not create gamification stats:', createErr);
            setUserStats(null);
          }
        }
        return;
      }

      if (stats) {
        // Update level based on points
        const calculatedLevel = calculateLevel(stats.total_points);
        if (calculatedLevel !== stats.level) {
          const { data: updatedStats } = await (supabase as any)
            .from('user_gamification_stats')
            .update({ level: calculatedLevel })
            .eq('user_id', user.id)
            .select()
            .single();
          
          setUserStats(updatedStats || { ...stats, level: calculatedLevel });
        } else {
          setUserStats(stats);
        }
      } else {
        // Check if user has sensors
        const { data: sensors } = await supabase
          .from('sensors')
          .select('id, is_problematic')
          .eq('user_id', user.id)
          .eq('is_deleted', false);
        
        if (sensors && sensors.length > 0) {
          // Create stats with sensor data
          const successfulSensors = sensors.filter(s => !s.is_problematic).length;
          const { data: newStats } = await (supabase as any)
            .from('user_gamification_stats')
            .insert({ 
              user_id: user.id,
              sensors_tracked: sensors.length,
              successful_sensors: successfulSensors
            })
            .select()
            .single();
          
          setUserStats(newStats);
        } else {
          // Create initial stats
          const { data: newStats } = await (supabase as any)
            .from('user_gamification_stats')
            .insert({ user_id: user.id })
            .select()
            .single();
          
          setUserStats(newStats);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserStats:', error);
      // Set null stats on error to prevent crashes
      setUserStats(null);
    }
  }, [user?.id]);

  const fetchUserAchievements = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching user achievements:', error);
        return;
      }

      setUserAchievements(data || []);
    } catch (error) {
      console.error('Error in fetchUserAchievements:', error);
    }
  }, [user?.id]);

  const fetchAllAchievements = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching achievements:', error);
        return;
      }

      setAllAchievements(data || []);
    } catch (error) {
      console.error('Error in fetchAllAchievements:', error);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchUserStats(),
      fetchUserAchievements(),
      fetchAllAchievements()
    ]);
    setLoading(false);
  }, [fetchUserStats, fetchUserAchievements, fetchAllAchievements]);

  const recordActivity = useCallback(async (activity: string) => {
    if (!user?.id) return;

    try {
      const { error } = await (supabase as any).rpc('update_daily_activity', {
        p_user_id: user.id,
        p_activity: activity
      });

      if (error) {
        console.error('Error recording activity:', error);
        return;
      }

      // Refresh stats after recording activity
      await fetchUserStats();
    } catch (error) {
      console.error('Error in recordActivity:', error);
    }
  }, [user?.id, fetchUserStats]);

  const recordLoginActivity = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Ensure user has gamification stats first
      const { data: existingStats } = await (supabase as any)
        .from('user_gamification_stats')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingStats) {
        // Create initial gamification stats
        await (supabase as any)
          .from('user_gamification_stats')
          .insert({ user_id: user.id });
      }

      const { error } = await (supabase as any).rpc('update_daily_activity', {
        p_user_id: user.id,
        p_activity: 'login'
      });

      if (error) {
        console.error('Error recording login activity:', error);
        return;
      }

      // Refresh stats after recording login activity
      await fetchUserStats();
    } catch (error) {
      console.error('Error in recordLoginActivity:', error);
    }
  }, [user?.id, fetchUserStats]);

  const showAchievementNotification = useCallback((achievement: Achievement) => {
    setAchievementNotifications(prev => [...prev, achievement]);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      setAchievementNotifications(prev => prev.filter(a => a.id !== achievement.id));
    }, 6000);
  }, []);

  const clearAchievementNotification = useCallback((achievementId: string) => {
    setAchievementNotifications(prev => prev.filter(a => a.id !== achievementId));
  }, []);

  const checkAchievements = useCallback(async (): Promise<UserAchievement[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await (supabase as any).rpc('check_and_award_achievements', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking achievements:', error);
        return [];
      }

      // Refresh achievements and stats if any were awarded
      if (data && data.length > 0) {
        await Promise.all([fetchUserStats(), fetchUserAchievements()]);
        
        // Show notifications for newly awarded achievements
        for (const awardedAchievement of data) {
          const achievement = allAchievements.find(a => a.id === awardedAchievement.awarded_achievement_id);
          if (achievement) {
            showAchievementNotification(achievement);
          }
        }
      }

      return data || [];
    } catch (error) {
      console.error('Error in checkAchievements:', error);
      return [];
    }
  }, [user?.id, fetchUserStats, fetchUserAchievements, allAchievements, showAchievementNotification]);

  const getLevel = useCallback((points: number): number => {
    return calculateLevel(points);
  }, []);

  const getPointsForNextLevel = useCallback((currentLevel: number): number => {
    return getPointsForLevel(currentLevel + 1);
  }, []);

  const getProgressToNextLevel = useCallback((points: number, level: number): number => {
    const currentLevelPoints = getPointsForLevel(level);
    const nextLevelPoints = getPointsForLevel(level + 1);
    const progress = (points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints);
    return Math.max(0, Math.min(100, progress * 100));
  }, []);

  const testHiddenAchievement = useCallback((achievementName: string) => {
    const achievement = allAchievements.find(a => a.name === achievementName);
    if (achievement) {
      showAchievementNotification(achievement);
    }
  }, [allAchievements, showAchievementNotification]);

  useEffect(() => {
    if (user) {
      refreshStats();
    } else {
      setUserStats(null);
      setUserAchievements([]);
      setAllAchievements([]);
      setLoading(false);
    }
  }, [user, refreshStats]);

  const value: GamificationContextType = {
    userStats,
    userAchievements,
    allAchievements,
    loading,
    refreshStats,
    recordActivity,
    recordLoginActivity,
    checkAchievements,
    getLevel,
    getPointsForNextLevel,
    getProgressToNextLevel,
    showAchievementNotification,
    achievementNotifications,
    clearAchievementNotification,
    testHiddenAchievement,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}