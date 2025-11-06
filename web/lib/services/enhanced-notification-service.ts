/**
 * Enhanced Notification Service
 * Integrates predictive alerts with existing notification system
 */

import { createClient } from '@/lib/supabase-client';
import { GlucosePredictionService, PredictionAlert } from './glucose-prediction';

export interface EnhancedNotification {
  id: string;
  user_id: string;
  type: 'glucose_alert' | 'iob_warning' | 'prediction_alert' | 'pattern_alert';
  subtype?: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: Date;
  created_at: Date;
  prediction_data?: {
    predicted_glucose: number;
    confidence: number;
    time_horizon: number;
    recommended_action?: string;
  };
}

export interface NotificationRule {
  id: string;
  user_id: string;
  rule_type: 'glucose_threshold' | 'iob_limit' | 'prediction_alert' | 'pattern_detection';
  conditions: Record<string, any>;
  actions: Record<string, any>;
  is_enabled: boolean;
  priority: number;
  created_at: Date;
}

export class EnhancedNotificationService {
  private static readonly MAX_NOTIFICATIONS_PER_HOUR = 10;

  /**
   * Process all notification rules for a user
   */
  static async processUserNotifications(userId: string): Promise<EnhancedNotification[]> {
    try {
      const notifications: EnhancedNotification[] = [];

      // Get user's notification rules
      const rules = await this.getUserNotificationRules(userId);

      // Process each rule type
      for (const rule of rules.filter(r => r.is_enabled)) {
        const ruleNotifications = await this.processNotificationRule(userId, rule);
        notifications.push(...ruleNotifications);
      }

      // Process predictive alerts
      const predictionNotifications = await this.processPredictiveAlerts(userId);
      notifications.push(...predictionNotifications);

      // Process pattern alerts
      const patternNotifications = await this.processPatternAlerts(userId);
      notifications.push(...patternNotifications);

      // Filter and prioritize notifications
      const filteredNotifications = await this.filterAndPrioritizeNotifications(userId, notifications);

      // Save notifications to database
      for (const notification of filteredNotifications) {
        await this.saveNotification(notification);
      }

      return filteredNotifications;
    } catch (error) {
      console.error('Error processing user notifications:', error);
      return [];
    }
  }

  /**
   * Process predictive alerts
   */
  private static async processPredictiveAlerts(userId: string): Promise<EnhancedNotification[]> {
    const notifications: EnhancedNotification[] = [];

    try {
      const prediction = await GlucosePredictionService.predictGlucose(userId);
      if (!prediction) return notifications;

      for (const alert of prediction.alerts) {
        // Check if we've already sent this type of alert recently
        const recentSimilar = await this.checkRecentSimilarAlert(userId, 'prediction_alert', alert.type);
        if (recentSimilar) continue;

        const notification: EnhancedNotification = {
          id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          type: 'prediction_alert',
          subtype: alert.type,
          title: this.getPredictionAlertTitle(alert),
          message: alert.message,
          severity: alert.severity,
          data: {
            alert_type: alert.type,
            estimated_time: alert.estimated_time,
            confidence: alert.confidence,
            ...(alert.recommended_action && { recommended_action: alert.recommended_action })
          },
          is_read: false,
          is_dismissed: false,
          expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          created_at: new Date(),
          prediction_data: {
            predicted_glucose: prediction.predicted_glucose,
            confidence: prediction.confidence,
            time_horizon: prediction.time_horizon,
            ...(alert.recommended_action && { recommended_action: alert.recommended_action })
          }
        };

        notifications.push(notification);
      }
    } catch (error) {
      console.error('Error processing predictive alerts:', error);
    }

    return notifications;
  }

  /**
   * Process pattern-based alerts
   */
  private static async processPatternAlerts(userId: string): Promise<EnhancedNotification[]> {
    const notifications: EnhancedNotification[] = [];

    try {
      // Get recent glucose readings
      const supabase = createClient();
      const { data: recentReadings } = await (supabase as any)
        .from('glucose_readings')
        .select('*')
        .eq('user_id', userId)
        .gte('system_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('system_time', { ascending: false })
        .limit(50);

      if (!recentReadings || recentReadings.length < 10) return notifications;

      // Detect patterns
      const patterns = await this.detectGlucosePatterns(recentReadings);

      for (const pattern of patterns) {
        const notification: EnhancedNotification = {
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          type: 'pattern_alert',
          subtype: pattern.type,
          title: this.getPatternAlertTitle(pattern),
          message: pattern.message,
          severity: pattern.severity,
          data: {
            pattern_type: pattern.type,
            confidence: pattern.confidence,
            occurrences: pattern.occurrences,
            recommendation: pattern.recommendation
          },
          is_read: false,
          is_dismissed: false,
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          created_at: new Date()
        };

        notifications.push(notification);
      }
    } catch (error) {
      console.error('Error processing pattern alerts:', error);
    }

    return notifications;
  }

  /**
   * Detect glucose patterns
   */
  private static async detectGlucosePatterns(readings: any[]) {
    const patterns = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Dawn phenomenon detection (4-8 AM)
    if (currentHour >= 4 && currentHour <= 8) {
      const morningReadings = readings.filter(r => {
        const hour = new Date(r.timestamp).getHours();
        return hour >= 4 && hour <= 8;
      });

      if (morningReadings.length >= 3) {
        const avgRise = this.calculateAverageRise(morningReadings);
        if (avgRise > 30) { // Significant dawn phenomenon
          patterns.push({
            type: 'dawn_phenomenon',
            message: `Dawn phenomenon detected: average rise of ${Math.round(avgRise)} mg/dL`,
            severity: 'medium' as const,
            confidence: 0.8,
            occurrences: morningReadings.length,
            recommendation: 'Consider adjusting basal insulin or bedtime snack'
          });
        }
      }
    }

    // Post-meal spike detection
    const recentSpikes = this.detectPostMealSpikes(readings);
    if (recentSpikes.length > 0) {
      patterns.push({
        type: 'post_meal_spike',
        message: `${recentSpikes.length} significant post-meal spikes detected in last 24h`,
        severity: recentSpikes.length > 3 ? 'high' as const : 'medium' as const,
        confidence: 0.7,
        occurrences: recentSpikes.length,
        recommendation: 'Consider pre-bolusing or adjusting carb ratios'
      });
    }

    // Overnight low detection
    const overnightLows = this.detectOvernightLows(readings);
    if (overnightLows.length > 0) {
      patterns.push({
        type: 'overnight_lows',
        message: `${overnightLows.length} overnight low glucose events detected`,
        severity: 'high' as const,
        confidence: 0.9,
        occurrences: overnightLows.length,
        recommendation: 'Consider reducing evening insulin or bedtime snack'
      });
    }

    return patterns;
  }

  /**
   * Process individual notification rule
   */
  private static async processNotificationRule(userId: string, rule: NotificationRule): Promise<EnhancedNotification[]> {
    const notifications: EnhancedNotification[] = [];

    try {
      switch (rule.rule_type) {
        case 'glucose_threshold':
          const glucoseNotifications = await this.processGlucoseThresholdRule(userId, rule);
          notifications.push(...glucoseNotifications);
          break;

        case 'iob_limit':
          const iobNotifications = await this.processIOBLimitRule(userId, rule);
          notifications.push(...iobNotifications);
          break;

        case 'prediction_alert':
          // Handled separately in processPredictiveAlerts
          break;

        case 'pattern_detection':
          // Handled separately in processPatternAlerts
          break;
      }
    } catch (error) {
      console.error(`Error processing rule ${rule.id}:`, error);
    }

    return notifications;
  }

  /**
   * Filter and prioritize notifications
   */
  private static async filterAndPrioritizeNotifications(
    userId: string, 
    notifications: EnhancedNotification[]
  ): Promise<EnhancedNotification[]> {
    // Check rate limiting
    const recentCount = await this.getRecentNotificationCount(userId);
    if (recentCount >= this.MAX_NOTIFICATIONS_PER_HOUR) {
      // Only allow critical notifications
      return notifications.filter(n => n.severity === 'critical');
    }

    // Remove duplicates
    const uniqueNotifications = this.removeDuplicateNotifications(notifications);

    // Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    uniqueNotifications.sort((a, b) => priorityOrder[b.severity] - priorityOrder[a.severity]);

    // Limit total notifications
    return uniqueNotifications.slice(0, 5);
  }

  /**
   * Save notification to database
   */
  private static async saveNotification(notification: EnhancedNotification): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('notifications')
        .insert({
          id: notification.id,
          user_id: notification.user_id,
          type: notification.type,
          subtype: notification.subtype,
          title: notification.title,
          message: notification.message,
          severity: notification.severity,
          data: notification.data,
          is_read: notification.is_read,
          is_dismissed: notification.is_dismissed,
          expires_at: notification.expires_at?.toISOString(),
          created_at: notification.created_at.toISOString()
        });

      if (error) throw error;

      // Trigger real-time notification
      await this.triggerRealtimeNotification(notification);
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  /**
   * Trigger real-time notification via WebSocket
   */
  private static async triggerRealtimeNotification(notification: EnhancedNotification): Promise<void> {
    try {
      // This would integrate with your WebSocket system
      // For now, we'll use Supabase realtime
      const supabase = createClient();
      await (supabase as any)
        .from('notifications')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', notification.id);
    } catch (error) {
      console.error('Error triggering realtime notification:', error);
    }
  }

  /**
   * Helper methods
   */
  private static async getUserNotificationRules(userId: string): Promise<NotificationRule[]> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('notification_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private static async checkRecentSimilarAlert(userId: string, type: string, subtype: string): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('subtype', subtype)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
      .limit(1);

    if (error) return false;
    return (data || []).length > 0;
  }

  private static async getRecentNotificationCount(userId: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (error) return 0;
    return count || 0;
  }

  private static removeDuplicateNotifications(notifications: EnhancedNotification[]): EnhancedNotification[] {
    const seen = new Set();
    return notifications.filter(notification => {
      const key = `${notification.type}_${notification.subtype}_${notification.severity}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private static getPredictionAlertTitle(alert: PredictionAlert): string {
    switch (alert.type) {
      case 'hypoglycemia_risk':
        return alert.severity === 'critical' ? '🚨 Critical Low Risk' : '⚠️ Low Glucose Risk';
      case 'hyperglycemia_risk':
        return '📈 High Glucose Risk';
      case 'trend_warning':
        return '📊 Rapid Glucose Change';
      default:
        return '🔔 Glucose Alert';
    }
  }

  private static getPatternAlertTitle(pattern: any): string {
    switch (pattern.type) {
      case 'dawn_phenomenon':
        return '🌅 Dawn Phenomenon Detected';
      case 'post_meal_spike':
        return '🍽️ Post-Meal Pattern Alert';
      case 'overnight_lows':
        return '🌙 Overnight Low Pattern';
      default:
        return '📊 Glucose Pattern Alert';
    }
  }

  private static calculateAverageRise(readings: any[]): number {
    if (readings.length < 2) return 0;
    
    const sorted = readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const first = sorted[0].glucose_value;
    const last = sorted[sorted.length - 1].glucose_value;
    
    return last - first;
  }

  private static detectPostMealSpikes(readings: any[]): any[] {
    // Simplified spike detection - would be more sophisticated in production
    return readings.filter(reading => reading.glucose_value > 200);
  }

  private static detectOvernightLows(readings: any[]): any[] {
    // Detect lows between 10 PM and 6 AM
    return readings.filter(reading => {
      const hour = new Date(reading.timestamp).getHours();
      return reading.glucose_value < 70 && (hour >= 22 || hour <= 6);
    });
  }

  private static async processGlucoseThresholdRule(_userId: string, _rule: NotificationRule): Promise<EnhancedNotification[]> {
    // Implementation for glucose threshold rules
    return [];
  }

  private static async processIOBLimitRule(_userId: string, _rule: NotificationRule): Promise<EnhancedNotification[]> {
    // Implementation for IOB limit rules
    return [];
  }
}