/**
 * Weekly Digest Email System
 * Generates and sends weekly community digest emails
 */

import { createClient } from '@supabase/supabase-js';
import { emailService } from './email-service';
import { emailTemplates, WeeklyDigestData } from './email-templates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class WeeklyDigestService {
  /**
   * Generate and send weekly digest emails
   */
  async sendWeeklyDigests(): Promise<{
    success: boolean;
    sentCount?: number;
    errorCount?: number;
    totalEligible?: number;
    weeklyStats?: any;
    message?: string;
    error?: string;
  }> {
    try {
      console.log('Starting weekly digest generation...');

      // Get the date range for this week
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      // Get week start date for tracking (Monday of the week)
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() - startDate.getDay() + 1);

      console.log(`Generating digest for week: ${weekStartDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

      // Get users who want weekly digest emails
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, notification_preferences')
        .not('notification_preferences', 'is', null);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return { success: false, error: usersError.message };
      }

      const eligibleUsers = users?.filter(user => {
        const prefs = user.notification_preferences || {};
        return prefs.emailNotifications && prefs.weeklyDigest;
      }) || [];

      console.log(`Found ${eligibleUsers.length} users eligible for weekly digest`);

      if (eligibleUsers.length === 0) {
        return { success: true, message: 'No users eligible for weekly digest' };
      }

      // Get weekly statistics
      const weeklyStats = await this.getWeeklyStats(startDate, endDate);

      // Skip if no activity this week
      if (weeklyStats.newTips === 0 && weeklyStats.newComments === 0) {
        console.log('No activity this week, skipping digest');
        return { success: true, message: 'No activity this week' };
      }

      let sentCount = 0;
      let errorCount = 0;

      // Send digest to each eligible user
      for (const user of eligibleUsers) {
        try {
          // Check if we already sent digest for this week
          const { data: existingDigest } = await supabase
            .from('weekly_digest_tracking')
            .select('id')
            .eq('user_id', user.id)
            .eq('week_start_date', weekStartDate.toISOString().split('T')[0])
            .single();

          if (existingDigest) {
            console.log(`Digest already sent to user ${user.id} for this week`);
            continue;
          }

          // Generate email content
          const emailData: WeeklyDigestData = {
            recipientName: user.full_name || user.email.split('@')[0],
            weeklyStats,
            unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications?unsubscribe=digest`
          };

          const template = emailTemplates.weeklyDigest(emailData);

          // Send email
          const result = await emailService.sendEmail({
            to: { email: user.email, name: user.full_name },
            template,
            priority: 'low'
          });

          if (result.success) {
            // Track successful send
            await supabase
              .from('weekly_digest_tracking')
              .insert({
                user_id: user.id,
                week_start_date: weekStartDate.toISOString().split('T')[0],
                sent_at: new Date().toISOString()
              });

            // Log notification
            await supabase
              .from('notification_logs')
              .insert({
                user_id: user.id,
                type: 'weekly_digest',
                success: true,
                metadata: {
                  week_start_date: weekStartDate.toISOString().split('T')[0],
                  stats: weeklyStats
                },
                sent_at: new Date().toISOString()
              });

            sentCount++;
            console.log(`Digest sent to ${user.email}`);
          } else {
            console.error(`Failed to send digest to ${user.email}:`, result.error);
            
            // Log failed notification
            await supabase
              .from('notification_logs')
              .insert({
                user_id: user.id,
                type: 'weekly_digest',
                success: false,
                error_message: result.error,
                metadata: {
                  week_start_date: weekStartDate.toISOString().split('T')[0],
                  stats: weeklyStats
                },
                sent_at: new Date().toISOString()
              });

            errorCount++;
          }
        } catch (userError) {
          console.error(`Error processing digest for user ${user.id}:`, userError);
          errorCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Weekly digest complete: ${sentCount} sent, ${errorCount} errors`);

      return {
        success: true,
        sentCount,
        errorCount,
        totalEligible: eligibleUsers.length,
        weeklyStats
      };

    } catch (error) {
      console.error('Error in weekly digest service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get weekly statistics for the digest
   */
  private async getWeeklyStats(startDate: Date, endDate: Date): Promise<{
    newTips: number;
    newComments: number;
    topTips: Array<{
      title: string;
      author: string;
      votes: number;
      url: string;
    }>;
  }> {
    try {
      // Get new tips count
      const { count: newTips } = await supabase
        .from('community_tips')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('is_deleted', false);

      // Get new comments count
      const { count: newComments } = await supabase
        .from('community_tip_comments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('is_deleted', false);

      // Get top tips of the week (by vote count)
      const { data: topTips } = await supabase
        .from('community_tips')
        .select(`
          id,
          title,
          author_name,
          upvotes,
          downvotes
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('is_deleted', false)
        .order('upvotes', { ascending: false })
        .limit(5);

      const formattedTopTips = (topTips || []).map(tip => ({
        title: tip.title,
        author: tip.author_name,
        votes: (tip.upvotes || 0) - (tip.downvotes || 0),
        url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community/tips/${tip.id}`
      }));

      return {
        newTips: newTips || 0,
        newComments: newComments || 0,
        topTips: formattedTopTips
      };
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      return {
        newTips: 0,
        newComments: 0,
        topTips: []
      };
    }
  }

  /**
   * Get digest statistics for admin dashboard
   */
  async getDigestStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get digest tracking data
      const { data: digestData, error } = await supabase
        .from('weekly_digest_tracking')
        .select('*')
        .gte('sent_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching digest stats:', error);
        return null;
      }

      // Group by week
      const weeklyData = digestData?.reduce((acc, item) => {
        const weekKey = item.week_start_date;
        if (!acc[weekKey]) {
          acc[weekKey] = {
            weekStartDate: weekKey,
            sentCount: 0,
            sentAt: item.sent_at
          };
        }
        acc[weekKey].sentCount++;
        return acc;
      }, {} as Record<string, any>) || {};

      return {
        totalDigestsSent: digestData?.length || 0,
        weeklyBreakdown: Object.values(weeklyData),
        lastDigestDate: digestData?.[0]?.sent_at || null
      };
    } catch (error) {
      console.error('Error getting digest statistics:', error);
      return null;
    }
  }
}

// Export singleton instance
export const weeklyDigestService = new WeeklyDigestService();