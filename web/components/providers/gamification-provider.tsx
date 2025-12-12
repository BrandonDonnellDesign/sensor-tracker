'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
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
  updateSensorCount: () => Promise<void>;
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
      const supabase = createClient();
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
      const supabase = createClient();
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
      const supabase = createClient();
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

  const updateSensorCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const supabase = createClient();
      // Get actual sensor count from sensors table
      const { data: sensors, error: sensorsError } = await supabase
        .from('sensors')
        .select('id, is_problematic')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (sensorsError) {
        console.error('Error fetching sensors for count update:', sensorsError);
        return;
      }

      const sensorsCount = sensors?.length || 0;
      const successfulSensors = sensors?.filter(s => !s.is_problematic).length || 0;

      // Update gamification stats with correct counts
      const { error: updateError } = await (supabase as any)
        .from('user_gamification_stats')
        .update({
          sensors_tracked: sensorsCount,
          successful_sensors: successfulSensors
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating sensor count:', updateError);
        return;
      }
      
    } catch (error) {
      console.error('Error in updateSensorCount:', error);
    }
  }, [user?.id]);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    await updateSensorCount(); // Update sensor count first
    await Promise.all([
      fetchUserStats(),
      fetchUserAchievements(),
      fetchAllAchievements()
    ]);
    setLoading(false);
  }, [updateSensorCount, fetchUserStats, fetchUserAchievements, fetchAllAchievements]);

  const recordActivity = useCallback(async (activity: string) => {
    if (!user?.id) return;

    try {
      const supabase = createClient();
      console.log('Recording activity:', { activity, userId: user.id });
      
      // Try RPC function first
      const { error: rpcError } = await (supabase as any).rpc('update_daily_activity', {
        p_activity: activity,
        p_user_id: user.id
      });

      if (rpcError) {
        console.log('RPC function failed, using fallback method:', rpcError);
        
        // Fallback: manually update tables
        const points = getPointsForActivity(activity);
        const today = new Date().toISOString().split('T')[0];

        // Insert daily activity (ignore if exists)
        await (supabase as any)
          .from('daily_activities')
          .upsert({
            user_id: user.id,
            activity_type: activity,
            activity_date: today,
            points_earned: points
          }, { onConflict: 'user_id,activity_type,activity_date' });

        // Update or create user stats
        const { data: existingStats } = await (supabase as any)
          .from('user_gamification_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingStats) {
          // Update existing stats with core columns only
          const updateData: any = {
            total_points: existingStats.total_points + points,
            last_activity_date: today
          };

          // Update level if points changed significantly
          const newLevel = Math.max(1, Math.floor((existingStats.total_points + points) / 100) + 1);
          if (newLevel !== existingStats.level) {
            updateData.level = newLevel;
          }

          await (supabase as any)
            .from('user_gamification_stats')
            .update(updateData)
            .eq('user_id', user.id);
        } else {
          // Create new stats with core columns only
          await (supabase as any)
            .from('user_gamification_stats')
            .insert({
              user_id: user.id,
              total_points: points,
              current_streak: 1,
              longest_streak: 1,
              level: Math.max(1, Math.floor(points / 100) + 1),
              last_activity_date: today,
              sensors_tracked: 0,
              successful_sensors: 0,
              achievements_earned: 0
            });
        }
      }

      console.log('Activity recorded successfully');
      // Refresh stats after recording activity
      await fetchUserStats();
    } catch (error) {
      console.error('Error in recordActivity:', error);
    }
  }, [user?.id, fetchUserStats]);

  // Helper function to get points for activity type
  const getPointsForActivity = (activity: string): number => {
    switch (activity) {
      case 'login': return 5;
      case 'sensor_added': return 20;
      case 'glucose_sync': return 10;
      case 'inventory_updated': return 5;
      case 'profile_updated': return 10;
      default: return 1;
    }
  };

  const recordLoginActivity = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Use the same recordActivity function with fallback
      await recordActivity('login');
    } catch (error) {
      console.error('Error in recordLoginActivity:', error);
    }
  }, [user?.id, recordActivity]);

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
      const supabase = createClient();
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

  // Check for achievements after stats are loaded
  useEffect(() => {
    if (user && userStats && !loading) {
      checkAchievements().catch(err => 
        console.error('Error checking achievements:', err)
      );
    }
  }, [user, userStats, loading, checkAchievements]);

  const value: GamificationContextType = {
    userStats,
    userAchievements,
    allAchievements,
    loading,
    refreshStats,
    updateSensorCount,
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