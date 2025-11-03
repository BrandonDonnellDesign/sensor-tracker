/**
 * Notification Manager
 * Handles when and how to send email notifications
 */

import { createClient } from '@supabase/supabase-js';
import { emailService } from './email-service';
import { emailTemplates, CommentReplyData, AdminAlertData } from './email-templates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  commentReplies: boolean;
  weeklyDigest: boolean;
  adminAlerts: boolean;
  email: string;
  name?: string;
}

class NotificationManager {
  /**
   * Send comment reply notification
   */
  async sendCommentReplyNotification(data: {
    originalCommentId: string;
    replyCommentId: string;
    tipId: string;
  }) {
    try {
      // Get original comment and author details
      const { data: originalComment, error: commentError } = await supabase
        .from('community_tip_comments')
        .select(`
          *,
          author:profiles!community_tip_comments_author_id_fkey(id, email, full_name, notification_preferences)
        `)
        .eq('id', data.originalCommentId)
        .single();

      if (commentError || !originalComment) {
        console.error('Error fetching original comment:', commentError);
        return;
      }

      // Get reply comment details
      const { data: replyComment, error: replyError } = await supabase
        .from('community_tip_comments')
        .select('*')
        .eq('id', data.replyCommentId)
        .single();

      if (replyError || !replyComment) {
        console.error('Error fetching reply comment:', replyError);
        return;
      }

      // Get tip details
      const { data: tip, error: tipError } = await supabase
        .from('community_tips')
        .select('title')
        .eq('id', data.tipId)
        .single();

      if (tipError || !tip) {
        console.error('Error fetching tip:', tipError);
        return;
      }

      // Check if user wants reply notifications
      const author = originalComment.author;
      const preferences = author.notification_preferences || {};
      
      if (!preferences.emailNotifications || !preferences.commentReplies) {
        console.log('User has disabled reply notifications');
        return;
      }

      // Don't send notification if replying to own comment
      if (originalComment.author_id === replyComment.author_id) {
        return;
      }

      // Prepare email data
      const emailData: CommentReplyData = {
        recipientName: author.full_name || author.email.split('@')[0],
        commenterName: replyComment.author_name,
        tipTitle: tip.title,
        commentContent: originalComment.content.substring(0, 200) + (originalComment.content.length > 200 ? '...' : ''),
        replyContent: replyComment.content.substring(0, 200) + (replyComment.content.length > 200 ? '...' : ''),
        tipUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community/tips/${data.tipId}#comment-${data.replyCommentId}`,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications?unsubscribe=replies`
      };

      // Send email
      const template = emailTemplates.commentReply(emailData);
      const result = await emailService.sendEmail({
        to: { email: author.email, name: author.full_name },
        template
      });

      // Log notification
      const logData: any = {
        userId: author.id,
        type: 'comment_reply',
        success: result.success,
        metadata: {
          originalCommentId: data.originalCommentId,
          replyCommentId: data.replyCommentId,
          tipId: data.tipId
        }
      };
      
      if (result.error) {
        logData.error = result.error;
      }
      
      await this.logNotification(logData);

      console.log('Comment reply notification sent:', result);
    } catch (error) {
      console.error('Error sending comment reply notification:', error);
    }
  }

  /**
   * Send admin alert for flagged content
   */
  async sendAdminAlert(data: {
    contentType: 'tip' | 'comment';
    contentId: string;
    flagReason: string;
    authorId: string;
    authorName: string;
  }) {
    try {
      // Get admin users
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id, email, full_name, notification_preferences')
        .eq('role', 'admin');

      if (adminError || !admins?.length) {
        console.error('Error fetching admins:', adminError);
        return;
      }

      // Get content details
      let contentTitle = '';
      let contentPreview = '';
      
      if (data.contentType === 'tip') {
        const { data: tip } = await supabase
          .from('community_tips')
          .select('title, content')
          .eq('id', data.contentId)
          .single();
        
        if (tip) {
          contentTitle = tip.title;
          contentPreview = tip.content.substring(0, 300) + (tip.content.length > 300 ? '...' : '');
        }
      } else {
        const { data: comment } = await supabase
          .from('community_tip_comments')
          .select('content')
          .eq('id', data.contentId)
          .single();
        
        if (comment) {
          contentPreview = comment.content.substring(0, 300) + (comment.content.length > 300 ? '...' : '');
        }
      }

      // Send to each admin who wants alerts
      for (const admin of admins) {
        const preferences = admin.notification_preferences || {};
        
        if (!preferences.emailNotifications || !preferences.adminAlerts) {
          continue;
        }

        const emailData: AdminAlertData = {
          adminName: admin.full_name || admin.email.split('@')[0],
          alertType: 'flagged_content',
          contentType: data.contentType,
          contentTitle,
          contentPreview,
          authorName: data.authorName,
          flagReason: data.flagReason,
          moderationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/community`
        };

        const template = emailTemplates.adminAlert(emailData);
        const result = await emailService.sendEmail({
          to: { email: admin.email, name: admin.full_name },
          template,
          priority: 'high'
        });

        // Log notification
        const logData: any = {
          userId: admin.id,
          type: 'admin_alert',
          success: result.success,
          metadata: {
            contentType: data.contentType,
            contentId: data.contentId,
            flagReason: data.flagReason
          }
        };
        
        if (result.error) {
          logData.error = result.error;
        }
        
        await this.logNotification(logData);
      }
    } catch (error) {
      console.error('Error sending admin alert:', error);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userId: string) {
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('email, full_name, notification_preferences')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('Error fetching user for welcome email:', error);
        return;
      }

      const preferences = user.notification_preferences || {};
      if (!preferences.emailNotifications) {
        return;
      }

      const template = emailTemplates.welcomeEmail(
        user.full_name || user.email.split('@')[0],
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications`
      );

      const result = await emailService.sendEmail({
        to: { email: user.email, name: user.full_name },
        template
      });

      const logData: any = {
        userId,
        type: 'welcome',
        success: result.success
      };
      
      if (result.error) {
        logData.error = result.error;
      }
      
      await this.logNotification(logData);

      console.log('Welcome email sent:', result);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, notification_preferences')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      const prefs = user.notification_preferences || {};
      
      return {
        userId: user.id,
        email: user.email,
        name: user.full_name,
        emailNotifications: prefs.emailNotifications ?? true,
        commentReplies: prefs.commentReplies ?? true,
        weeklyDigest: prefs.weeklyDigest ?? true,
        adminAlerts: prefs.adminAlerts ?? false
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: {
            emailNotifications: preferences.emailNotifications,
            commentReplies: preferences.commentReplies,
            weeklyDigest: preferences.weeklyDigest,
            adminAlerts: preferences.adminAlerts
          }
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Log notification for analytics
   */
  private async logNotification(data: {
    userId: string;
    type: string;
    success: boolean;
    error?: string;
    metadata?: any;
  }) {
    try {
      await supabase
        .from('notification_logs')
        .insert({
          user_id: data.userId,
          type: data.type,
          success: data.success,
          error_message: data.error,
          metadata: data.metadata,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();