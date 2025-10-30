'use server';

import { createClient } from '@supabase/supabase-js';

// Create a service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  badge_color: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  requirement_data: any;
  is_repeatable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  earned_count?: number;
}

export interface UserStats {
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
  analytics_views: number;
  stable_sensors: number;
  archived_sensors: number;
  account_age_days: number;
  sensor_edits: number;
  tags_used: number;
  sensors_total: number;
  photos_added: number;
  page_visited: number;
  achievement_completion: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export interface OverviewStats {
  totalUsers: number;
  totalAchievements: number;
  totalPointsAwarded: number;
  activeUsers: number;
}

export async function getAchievements(): Promise<Achievement[]> {
  try {
    
    // Get achievements
    const { data: achievementsData, error: achievementsError } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: false });

    if (achievementsError) {
      console.error('Server: Error loading achievements:', achievementsError);
      return [];
    }



    // Get earned counts for each achievement
    const { data: userAchievements, error: userAchievementsError } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id');

    if (userAchievementsError) {
      console.error('Server: Error loading user achievements:', userAchievementsError);
    }

    // Count achievements by ID
    const earnedCounts: Record<string, number> = {};
    userAchievements?.forEach((ua: any) => {
      earnedCounts[ua.achievement_id] = (earnedCounts[ua.achievement_id] || 0) + 1;
    });

    // Combine achievements with earned counts
    const achievementsWithCounts = (achievementsData || []).map((achievement: any) => ({
      ...achievement,
      earned_count: earnedCounts[achievement.id] || 0
    }));


    return achievementsWithCounts;
  } catch (error) {
    console.error('Server: Exception loading achievements:', error);
    return [];
  }
}

export async function getUserStats(): Promise<UserStats[]> {
  try {
    
    // Get user gamification stats
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(20);

    if (statsError) {
      console.error('Server: Error loading user stats:', statsError);
      return [];
    }



    if (!statsData || statsData.length === 0) {
      return [];
    }

    // Get user IDs to fetch profile data
    const userIds = statsData.map((stat: any) => stat.user_id);

    // Get profile data for these users
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Server: Error loading profiles:', profilesError);
    }

    // Combine stats with profile data
    const combinedData = statsData.map((stat: any) => {
      const profile = profilesData?.find((p: any) => p.id === stat.user_id);
      return {
        ...stat,
        profiles: profile || null
      };
    });


    return combinedData;
  } catch (error) {
    console.error('Server: Exception loading user stats:', error);
    return [];
  }
}

export async function getOverviewStats(): Promise<OverviewStats> {
  try {

    // Get total users with gamification stats
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Server: Error loading user count:', usersError);
    }

    // Get total achievements
    const { count: totalAchievements, error: achievementsError } = await supabaseAdmin
      .from('achievements')
      .select('*', { count: 'exact', head: true });

    if (achievementsError) {
      console.error('Server: Error loading achievement count:', achievementsError);
    }

    // Get total points awarded
    const { data: pointsData, error: pointsError } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('total_points');

    if (pointsError) {
      console.error('Server: Error loading points data:', pointsError);
    }

    const totalPointsAwarded = pointsData?.reduce(
      (sum: number, user: any) => sum + (user.total_points || 0),
      0
    ) || 0;

    // Get active users (users with activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: activeUsers, error: activeUsersError } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('*', { count: 'exact', head: true })
      .gte('last_activity_date', sevenDaysAgo.toISOString().split('T')[0]);

    if (activeUsersError) {
      console.error('Server: Error loading active users:', activeUsersError);
    }

    const stats = {
      totalUsers: totalUsers || 0,
      totalAchievements: totalAchievements || 0,
      totalPointsAwarded,
      activeUsers: activeUsers || 0,
    };


    return stats;
  } catch (error) {
    console.error('Server: Exception loading overview stats:', error);
    return {
      totalUsers: 0,
      totalAchievements: 0,
      totalPointsAwarded: 0,
      activeUsers: 0,
    };
  }
}

export async function toggleAchievement(achievementId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('achievements')
      .update({ is_active: !isActive })
      .eq('id', achievementId);

    if (error) {
      console.error('Server: Error toggling achievement:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Server: Exception toggling achievement:', error);
    return { success: false, error: 'Failed to toggle achievement' };
  }
}

export async function awardAchievement(userId: string, achievementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Server: Awarding achievement', achievementId, 'to user', userId);

    // Check if user already has this achievement
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Server: Error checking existing achievement:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existing) {
      return { success: false, error: 'User already has this achievement' };
    }

    // Get achievement details for points
    const { data: achievement, error: achievementError } = await supabaseAdmin
      .from('achievements')
      .select('points')
      .eq('id', achievementId)
      .single();

    if (achievementError) {
      console.error('Server: Error getting achievement details:', achievementError);
      return { success: false, error: achievementError.message };
    }

    // Award the achievement
    const { error: awardError } = await supabaseAdmin
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        earned_at: new Date().toISOString(),
        progress_data: { awarded_manually: true }
      });

    if (awardError) {
      console.error('Server: Error awarding achievement:', awardError);
      return { success: false, error: awardError.message };
    }

    // Update user stats - first get current stats
    const { data: currentStats } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('total_points, achievements_earned')
      .eq('user_id', userId)
      .single();

    const newTotalPoints = (currentStats?.total_points || 0) + achievement.points;
    const newAchievementsEarned = (currentStats?.achievements_earned || 0) + 1;

    const { error: statsError } = await supabaseAdmin
      .from('user_gamification_stats')
      .upsert({
        user_id: userId,
        total_points: newTotalPoints,
        achievements_earned: newAchievementsEarned,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (statsError) {
      console.error('Server: Error updating user stats:', statsError);
      // Don't fail the whole operation for stats update issues
    }

    console.log('Server: Successfully awarded achievement');
    return { success: true };
  } catch (error) {
    console.error('Server: Exception awarding achievement:', error);
    return { success: false, error: 'Failed to award achievement' };
  }
}

export async function removeAchievement(userId: string, achievementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Server: Removing achievement', achievementId, 'from user', userId);

    // Check if user has this achievement
    const { error: checkError } = await supabaseAdmin
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') { // No rows returned
        return { success: false, error: 'User does not have this achievement' };
      }
      console.error('Server: Error checking existing achievement:', checkError);
      return { success: false, error: checkError.message };
    }

    // Get achievement details for points
    const { data: achievement, error: achievementError } = await supabaseAdmin
      .from('achievements')
      .select('points')
      .eq('id', achievementId)
      .single();

    if (achievementError) {
      console.error('Server: Error getting achievement details:', achievementError);
      return { success: false, error: achievementError.message };
    }

    // Remove the achievement
    const { error: removeError } = await supabaseAdmin
      .from('user_achievements')
      .delete()
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (removeError) {
      console.error('Server: Error removing achievement:', removeError);
      return { success: false, error: removeError.message };
    }

    // Update user stats - first get current stats
    const { data: currentStats } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('total_points, achievements_earned')
      .eq('user_id', userId)
      .single();

    const newTotalPoints = Math.max((currentStats?.total_points || 0) - achievement.points, 0);
    const newAchievementsEarned = Math.max((currentStats?.achievements_earned || 0) - 1, 0);

    const { error: statsError } = await supabaseAdmin
      .from('user_gamification_stats')
      .update({
        total_points: newTotalPoints,
        achievements_earned: newAchievementsEarned,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (statsError) {
      console.error('Server: Error updating user stats:', statsError);
      // Don't fail the whole operation for stats update issues
    }

    console.log('Server: Successfully removed achievement');
    return { success: true };
  } catch (error) {
    console.error('Server: Exception removing achievement:', error);
    return { success: false, error: 'Failed to remove achievement' };
  }
}

export async function getUserAchievements(userId: string): Promise<{ id: string; name: string; earned_at: string }[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_achievements')
      .select(`
        id,
        earned_at,
        achievements:achievement_id (
          id,
          name,
          icon,
          points
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Server: Error loading user achievements:', error);
      return [];
    }

    return (data || []).map((ua: any) => ({
      id: ua.achievements.id,
      name: ua.achievements.name,
      icon: ua.achievements.icon,
      points: ua.achievements.points,
      earned_at: ua.earned_at
    }));
  } catch (error) {
    console.error('Server: Exception loading user achievements:', error);
    return [];
  }
}