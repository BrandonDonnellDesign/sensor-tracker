'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from './auth-provider';
import { StreakTracker, StreakData, StreakUtils } from '@/lib/streak-tracker';

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

interface StreakStatus {
  streakData: StreakData;
  status: 'active' | 'at_risk' | 'broken';
  message: string;
  daysUntilRisk: number;
}

interface GamificationContextType {
  userStats: UserStats | null;
  userAchievements: UserAchievement[];
  allAchievements: Achievement[];
  streakStatus: StreakStatus | null;
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
  // New streak-specific methods
  getStreakAnalytics: () => Promise<any>;
  recalculateStreaks: () => Promise<void>;
  backfillStreaks: (startDate: string, endDate: string) => Promise<void>;
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
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [achievementNotifications, setAchievementNotifications] = useState<Achievement[]>([]);
  const [streakTracker, setStreakTracker] = useState<StreakTracker | null>(null);

  // Initialize streak tracker when user changes
  useEffect(() => {
    if (user?.id) {
      const timezone = StreakUtils.getUserTimezone();
      setStreakTracker(new StreakTracker(user.id, timezone));
    } else {
      setStreakTracker(null);
    }
  }, [user?.id]);

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

  const fetchStreakStatus = useCallback(async () => {
    if (!streakTracker) return;

    try {
      const status = await streakTracker.getStreakStatus('login');
      
      // If the new streak system returns 0 or broken status, 
      // but we have user stats with a streak, use the database value
      if ((status.streakData.currentStreak === 0 || status.status === 'broken') && userStats?.current_streak > 0) {
        // Create a corrected streak status using database values
        const correctedStatus = {
          streakData: {
            currentStreak: userStats.current_streak,
            longestStreak: userStats.longest_streak,
            lastActivityDate: userStats.last_activity_date,
            streakStartDate: null,
            isActiveToday: userStats.last_activity_date === new Date().toISOString().split('T')[0],
            nextStreakDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          status: 'active' as const,
          message: `${userStats.current_streak} day streak! Keep it going!`,
          daysUntilRisk: 1
        };
        
        setStreakStatus(correctedStatus);
      } else {
        setStreakStatus(status);
      }
    } catch (error) {
      console.error('Error fetching streak status:', error);
      
      // Fallback to database values if available
      if (userStats?.current_streak > 0) {
        const fallbackStatus = {
          streakData: {
            currentStreak: userStats.current_streak,
            longestStreak: userStats.longest_streak,
            lastActivityDate: userStats.last_activity_date,
            streakStartDate: null,
            isActiveToday: userStats.last_activity_date === new Date().toISOString().split('T')[0],
            nextStreakDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          status: 'active' as const,
          message: `${userStats.current_streak} day streak! Keep it going!`,
          daysUntilRisk: 1
        };
        
        setStreakStatus(fallbackStatus);
      } else {
        setStreakStatus(null);
      }
    }
  }, [streakTracker, userStats]);

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

      // Handle table not existing
      if (error?.message?.includes('relation "public.user_achievements" does not exist') ||
          error?.message?.includes('relation "public.achievements" does not exist')) {
        console.warn('Gamification achievement tables not yet created. Run migrations to enable achievement features.');
        setUserAchievements([]);
        return;
      }

      if (error) {
        console.error('Error fetching user achievements:', error);
        setUserAchievements([]);
        return;
      }

      setUserAchievements(data || []);
    } catch (error) {
      console.error('Error in fetchUserAchievements:', error);
      setUserAchievements([]);
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

      // Handle table not existing
      if (error?.message?.includes('relation "public.achievements" does not exist')) {
        console.warn('Gamification achievements table not yet created. Run migrations to enable achievement features.');
        setAllAchievements([]);
        return;
      }

      if (error) {
        console.error('Error fetching achievements:', error);
        setAllAchievements([]);
        return;
      }

      setAllAchievements(data || []);
    } catch (error) {
      console.error('Error in fetchAllAchievements:', error);
      setAllAchievements([]);
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
    
    // Clear any cached data
    setUserStats(null);
    setStreakStatus(null);
    
    await updateSensorCount(); // Update sensor count first
    await Promise.all([
      fetchUserStats(),
      fetchUserAchievements(),
      fetchAllAchievements()
    ]);
    
    // Fetch streak status after user stats are loaded
    await fetchStreakStatus();
    
    setLoading(false);
  }, [updateSensorCount, fetchUserStats, fetchUserAchievements, fetchAllAchievements, fetchStreakStatus]);

  const recordActivity = useCallback(async (activity: string) => {
    if (!user?.id || !streakTracker) return;

    try {
      const points = getPointsForActivity(activity);
      
      // Use new streak tracker
      const streakData = await streakTracker.recordActivity(activity, points);
      
      // Update user stats in database
      const supabase = createClient();
      const { data: existingStats } = await (supabase as any)
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingStats) {
        // Update existing stats
        const updateData: any = {
          total_points: existingStats.total_points + points,
          current_streak: streakData.currentStreak,
          longest_streak: Math.max(existingStats.longest_streak, streakData.longestStreak),
          last_activity_date: streakData.lastActivityDate || new Date().toISOString().split('T')[0]
        };

        // Update level if points changed significantly
        const newLevel = calculateLevel(existingStats.total_points + points);
        if (newLevel !== existingStats.level) {
          updateData.level = newLevel;
        }

        await (supabase as any)
          .from('user_gamification_stats')
          .update(updateData)
          .eq('user_id', user.id);
      } else {
        // Create new stats
        await (supabase as any)
          .from('user_gamification_stats')
          .insert({
            user_id: user.id,
            total_points: points,
            current_streak: streakData.currentStreak,
            longest_streak: streakData.longestStreak,
            level: calculateLevel(points),
            last_activity_date: streakData.lastActivityDate || new Date().toISOString().split('T')[0],
            sensors_tracked: 0,
            successful_sensors: 0,
            achievements_earned: 0
          });
      }

      // Refresh stats and streak status
      await Promise.all([fetchUserStats(), fetchStreakStatus()]);
    } catch (error) {
      console.error('Error in recordActivity:', error);
    }
  }, [user?.id, streakTracker, fetchUserStats, fetchStreakStatus]);

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
      // Use the new streak system directly
      await recordActivity('login');
    } catch (error) {
      console.error('Error in recordLoginActivity:', error);
    }
  }, [user?.id, recordActivity]);

  const getStreakAnalytics = useCallback(async () => {
    if (!streakTracker) return null;
    
    try {
      return await streakTracker.getStreakAnalytics('login');
    } catch (error) {
      console.error('Error getting streak analytics:', error);
      return null;
    }
  }, [streakTracker]);

  const recalculateStreaks = useCallback(async () => {
    if (!streakTracker) return;
    
    try {
      const streakData = await streakTracker.calculateStreaks('login');
      await streakTracker.updateUserStats(streakData);
      await Promise.all([fetchUserStats(), fetchStreakStatus()]);
    } catch (error) {
      console.error('Error recalculating streaks:', error);
    }
  }, [streakTracker, fetchUserStats, fetchStreakStatus]);

  const backfillStreaks = useCallback(async (startDate: string, endDate: string) => {
    if (!streakTracker) return;
    
    try {
      await streakTracker.backfillActivities(startDate, endDate, 'login', 5);
      const streakData = await streakTracker.calculateStreaks('login');
      await streakTracker.updateUserStats(streakData);
      await Promise.all([fetchUserStats(), fetchStreakStatus()]);
    } catch (error) {
      console.error('Error backfilling streaks:', error);
    }
  }, [streakTracker, fetchUserStats, fetchStreakStatus]);

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

      // Handle function or tables not existing
      if (error?.message?.includes('function "check_and_award_achievements" does not exist') ||
          error?.message?.includes('relation "public.achievements" does not exist') ||
          error?.message?.includes('relation "public.user_achievements" does not exist')) {
        console.warn('Gamification system not fully initialized. Run migrations to enable achievement checking.');
        return [];
      }

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
      // Call refreshStats directly without dependency to avoid infinite loop
      const loadInitialData = async () => {
        setLoading(true);
        
        // Clear any cached data
        setUserStats(null);
        setStreakStatus(null);
        
        await updateSensorCount(); // Update sensor count first
        await Promise.all([
          fetchUserStats(),
          fetchUserAchievements(),
          fetchAllAchievements()
        ]);
        
        // Fetch streak status after user stats are loaded
        await fetchStreakStatus();
        
        setLoading(false);
      };
      
      loadInitialData();
    } else {
      setUserStats(null);
      setUserAchievements([]);
      setAllAchievements([]);
      setStreakStatus(null);
      setLoading(false);
    }
  }, [user?.id]); // Only depend on user.id to avoid infinite loop

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
    streakStatus,
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
    // New streak methods
    getStreakAnalytics,
    recalculateStreaks,
    backfillStreaks,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}