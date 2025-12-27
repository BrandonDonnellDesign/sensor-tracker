/**
 * Modern Streak Tracking System
 * 
 * This system provides accurate, efficient streak calculation with:
 * - Real-time streak updates
 * - Timezone-aware calculations
 * - Efficient caching
 * - Multiple activity types support
 * - Streak recovery and maintenance
 */

import { createClient } from '@/lib/supabase-client';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakStartDate: string | null;
  isActiveToday: boolean;
  nextStreakDate: string;
}

export interface ActivityRecord {
  id: string;
  user_id: string;
  activity_date: string;
  activity_type: string;
  points_earned: number;
  created_at: string;
}

export class StreakTracker {
  private supabase = createClient();
  private userId: string;
  private timezone: string;

  constructor(userId: string, timezone: string = 'UTC') {
    this.userId = userId;
    this.timezone = timezone;
  }

  /**
   * Get current date in user's timezone as YYYY-MM-DD
   */
  private getCurrentDate(): string {
    const now = new Date();
    // Convert to user's timezone
    const userDate = new Date(now.toLocaleString("en-US", { timeZone: this.timezone }));
    return userDate.toISOString().split('T')[0];
  }

  /**
   * Get yesterday's date in user's timezone
   */
  private getYesterdayDate(): string {
    const today = new Date(this.getCurrentDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Get tomorrow's date in user's timezone
   */
  private getTomorrowDate(): string {
    const today = new Date(this.getCurrentDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   * Check if two dates are consecutive
   */
  private areConsecutiveDates(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  /**
   * Get all activity dates for the user, sorted by date descending
   */
  private async getActivityDates(activityType: string = 'login'): Promise<string[]> {
    const { data, error } = await (this.supabase as any)
      .from('daily_activities')
      .select('activity_date')
      .eq('user_id', this.userId)
      .eq('activity_type', activityType)
      .order('activity_date', { ascending: false });

    if (error) {
      console.error('Error fetching activity dates:', error);
      return [];
    }

    return data?.map((record: any) => record.activity_date) || [];
  }

  /**
   * Calculate current streak from activity dates
   */
  private calculateCurrentStreak(activityDates: string[]): { streak: number, startDate: string | null } {
    if (activityDates.length === 0) {
      return { streak: 0, startDate: null };
    }

    const today = this.getCurrentDate();
    const yesterday = this.getYesterdayDate();
    
    // Check if user has activity today or yesterday
    const mostRecentDate = activityDates[0];
    
    // Streak is broken if last activity is more than 1 day ago
    if (mostRecentDate !== today && mostRecentDate !== yesterday) {
      return { streak: 0, startDate: null };
    }

    // Count consecutive days starting from most recent
    let streak = 0;
    let expectedDate = mostRecentDate;
    let startDate = mostRecentDate;

    for (const activityDate of activityDates) {
      if (activityDate === expectedDate) {
        streak++;
        startDate = activityDate;
        
        // Move to previous day
        const currentDate = new Date(expectedDate);
        currentDate.setDate(currentDate.getDate() - 1);
        expectedDate = currentDate.toISOString().split('T')[0];
      } else {
        // Gap found, streak ends
        break;
      }
    }

    return { streak, startDate };
  }

  /**
   * Calculate longest streak from all activity dates
   */
  private calculateLongestStreak(activityDates: string[]): number {
    if (activityDates.length === 0) return 0;

    let longestStreak = 0;
    let currentStreak = 0;
    let previousDate: string | null = null;

    // Sort dates in ascending order for this calculation
    const sortedDates = [...activityDates].sort();

    for (const date of sortedDates) {
      if (previousDate === null || this.areConsecutiveDates(previousDate, date)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1; // Reset streak
      }
      previousDate = date;
    }

    return longestStreak;
  }

  /**
   * Record a new activity and update streaks
   */
  async recordActivity(activityType: string = 'login', points: number = 5): Promise<StreakData> {
    const today = this.getCurrentDate();

    try {
      // Insert or update today's activity
      const { error: activityError } = await (this.supabase as any)
        .from('daily_activities')
        .upsert({
          user_id: this.userId,
          activity_type: activityType,
          activity_date: today,
          points_earned: points,
          activity_count: 1,
          activities: '[]'
        }, { 
          onConflict: 'user_id,activity_type,activity_date',
          ignoreDuplicates: true 
        });

      if (activityError) {
        console.error('Error recording activity:', activityError);
        throw activityError;
      }

      // Calculate updated streaks
      return await this.calculateStreaks(activityType);
    } catch (error) {
      console.error('Error in recordActivity:', error);
      throw error;
    }
  }

  /**
   * Calculate current streak data
   */
  async calculateStreaks(activityType: string = 'login'): Promise<StreakData> {
    try {
      const activityDates = await this.getActivityDates(activityType);
      const today = this.getCurrentDate();
      
      const { streak: currentStreak, startDate: streakStartDate } = this.calculateCurrentStreak(activityDates);
      const longestStreak = this.calculateLongestStreak(activityDates);
      
      const isActiveToday = activityDates.includes(today);
      const lastActivityDate = activityDates.length > 0 ? activityDates[0] : null;
      const nextStreakDate = this.getTomorrowDate();

      return {
        currentStreak,
        longestStreak,
        lastActivityDate,
        streakStartDate,
        isActiveToday,
        nextStreakDate
      };
    } catch (error) {
      console.error('Error calculating streaks:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakStartDate: null,
        isActiveToday: false,
        nextStreakDate: this.getTomorrowDate()
      };
    }
  }

  /**
   * Update user gamification stats with new streak data
   */
  async updateUserStats(streakData: StreakData): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('user_gamification_stats')
        .update({
          current_streak: streakData.currentStreak,
          longest_streak: streakData.longestStreak,
          last_activity_date: streakData.lastActivityDate || this.getCurrentDate()
        })
        .eq('user_id', this.userId);

      if (error) {
        console.error('Error updating user stats:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateUserStats:', error);
      throw error;
    }
  }

  /**
   * Get streak status for display
   */
  async getStreakStatus(activityType: string = 'login'): Promise<{
    streakData: StreakData;
    status: 'active' | 'at_risk' | 'broken';
    message: string;
    daysUntilRisk: number;
  }> {
    const streakData = await this.calculateStreaks(activityType);
    const today = this.getCurrentDate();
    const yesterday = this.getYesterdayDate();
    
    let status: 'active' | 'at_risk' | 'broken' = 'broken';
    let message = '';
    let daysUntilRisk = 0;

    if (streakData.isActiveToday) {
      status = 'active';
      message = `${streakData.currentStreak} day streak! Keep it going tomorrow.`;
      daysUntilRisk = 1;
    } else if (streakData.lastActivityDate === yesterday) {
      status = 'at_risk';
      message = `${streakData.currentStreak} day streak at risk! Log in today to continue.`;
      daysUntilRisk = 0;
    } else {
      status = 'broken';
      if (streakData.longestStreak > 0) {
        message = `Streak broken. Your best was ${streakData.longestStreak} days. Start a new one today!`;
      } else {
        message = 'Start your first streak today!';
      }
      daysUntilRisk = 0;
    }

    return {
      streakData,
      status,
      message,
      daysUntilRisk
    };
  }

  /**
   * Backfill activities for a date range
   */
  async backfillActivities(
    startDate: string, 
    endDate: string, 
    activityType: string = 'login',
    points: number = 5
  ): Promise<{ added: number; skipped: number }> {
    try {
      const activitiesToAdd = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get existing activities to avoid duplicates
      const { data: existingActivities } = await (this.supabase as any)
        .from('daily_activities')
        .select('activity_date')
        .eq('user_id', this.userId)
        .eq('activity_type', activityType)
        .gte('activity_date', startDate)
        .lte('activity_date', endDate);

      const existingDates = new Set(
        existingActivities?.map((a: any) => a.activity_date) || []
      );

      // Generate activities for each day in range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        if (!existingDates.has(dateStr)) {
          activitiesToAdd.push({
            user_id: this.userId,
            activity_type: activityType,
            activity_date: dateStr,
            points_earned: points,
            activity_count: 1,
            activities: '[]'
          });
        }
      }

      // Insert in batches
      let added = 0;
      const batchSize = 50;
      
      for (let i = 0; i < activitiesToAdd.length; i += batchSize) {
        const batch = activitiesToAdd.slice(i, i + batchSize);
        const { error } = await (this.supabase as any)
          .from('daily_activities')
          .insert(batch);
        
        if (!error) {
          added += batch.length;
        } else {
          console.error('Error inserting batch:', error);
        }
      }

      return {
        added,
        skipped: existingActivities?.length || 0
      };
    } catch (error) {
      console.error('Error in backfillActivities:', error);
      throw error;
    }
  }

  /**
   * Get streak analytics
   */
  async getStreakAnalytics(activityType: string = 'login'): Promise<{
    totalDays: number;
    activeDays: number;
    consistencyRate: number;
    averageStreakLength: number;
    streakBreaks: number;
    longestGap: number;
  }> {
    try {
      const activityDates = await this.getActivityDates(activityType);
      
      if (activityDates.length === 0) {
        return {
          totalDays: 0,
          activeDays: 0,
          consistencyRate: 0,
          averageStreakLength: 0,
          streakBreaks: 0,
          longestGap: 0
        };
      }

      const sortedDates = [...activityDates].sort();
      const firstDate = new Date(sortedDates[0]);
      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const activeDays = activityDates.length;
      const consistencyRate = (activeDays / totalDays) * 100;

      // Calculate streaks and breaks
      let streakBreaks = 0;
      let currentStreakLength = 0;
      let streakLengths: number[] = [];
      let longestGap = 0;
      let currentGap = 0;
      let previousDate: string | null = null;

      for (const date of sortedDates) {
        if (previousDate === null || this.areConsecutiveDates(previousDate, date)) {
          currentStreakLength++;
          if (currentGap > 0) {
            longestGap = Math.max(longestGap, currentGap);
            currentGap = 0;
          }
        } else {
          if (currentStreakLength > 0) {
            streakLengths.push(currentStreakLength);
            streakBreaks++;
          }
          currentStreakLength = 1;
          
          // Calculate gap
          const prevDate = new Date(previousDate);
          const currDate = new Date(date);
          currentGap = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)) - 1;
        }
        previousDate = date;
      }

      // Add final streak
      if (currentStreakLength > 0) {
        streakLengths.push(currentStreakLength);
      }

      const averageStreakLength = streakLengths.length > 0 
        ? streakLengths.reduce((sum, length) => sum + length, 0) / streakLengths.length 
        : 0;

      return {
        totalDays,
        activeDays,
        consistencyRate: Math.round(consistencyRate * 100) / 100,
        averageStreakLength: Math.round(averageStreakLength * 100) / 100,
        streakBreaks,
        longestGap
      };
    } catch (error) {
      console.error('Error calculating streak analytics:', error);
      return {
        totalDays: 0,
        activeDays: 0,
        consistencyRate: 0,
        averageStreakLength: 0,
        streakBreaks: 0,
        longestGap: 0
      };
    }
  }
}

/**
 * Utility functions for streak tracking
 */
export const StreakUtils = {
  /**
   * Get user's timezone from browser
   */
  getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  },

  /**
   * Format streak message for display
   */
  formatStreakMessage(streak: number, isActive: boolean): string {
    if (streak === 0) {
      return 'Start your streak today!';
    }
    
    if (streak === 1) {
      return isActive ? 'Great start! Keep it going tomorrow.' : '1 day streak at risk!';
    }
    
    return isActive 
      ? `Amazing! ${streak} days in a row!` 
      : `${streak} day streak at risk! Don't break it now.`;
  },

  /**
   * Get streak emoji based on length
   */
  getStreakEmoji(streak: number): string {
    if (streak === 0) return '🎯';
    if (streak < 7) return '🔥';
    if (streak < 30) return '🚀';
    if (streak < 100) return '💎';
    return '👑';
  },

  /**
   * Calculate streak milestone rewards
   */
  getStreakMilestones(streak: number): { milestone: number; reward: string; isNew: boolean }[] {
    const milestones = [
      { days: 3, reward: 'First Steps Badge' },
      { days: 7, reward: 'Week Warrior Badge' },
      { days: 14, reward: 'Fortnight Fighter Badge' },
      { days: 30, reward: 'Monthly Master Badge' },
      { days: 60, reward: 'Consistency Champion Badge' },
      { days: 100, reward: 'Century Streak Badge' },
      { days: 365, reward: 'Year-Long Legend Badge' }
    ];

    return milestones.map(m => ({
      milestone: m.days,
      reward: m.reward,
      isNew: streak === m.days
    }));
  }
};