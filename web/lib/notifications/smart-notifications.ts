import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

export interface SmartNotification {
  id: string;
  type: 'reminder' | 'alert' | 'celebration' | 'tip' | 'warning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    label: string;
    url?: string;
    handler?: () => void;
  };
  dismissible: boolean;
  autoExpire?: number; // milliseconds
  conditions: {
    triggers: string[];
    frequency: 'once' | 'daily' | 'weekly' | 'on-condition';
  };
  confidence?: number; // 0-1 score
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationContext {
  sensors: Sensor[];
  userStats?: {
    total_points: number;
    level: number;
    current_streak: number;
    sensors_tracked: number;
  } | null;
  lastLogin?: Date;
  currentTime: Date;
}

export class SmartNotificationEngine {
  private notifications: SmartNotification[] = [];
  private dismissedNotifications = new Set<string>();
  private notificationHistory = new Map<string, Date>();

  generateNotifications(context: NotificationContext): SmartNotification[] {
    this.notifications = [];
    
    // Sensor-related notifications
    this.checkSensorReminders(context);
    this.checkSensorAlerts(context);
    
    // Achievement notifications
    this.checkAchievementProgress(context);
    
    // Health and safety notifications
    this.checkHealthReminders(context);
    
    // Engagement notifications
    this.checkEngagementTips(context);
    
    // Filter out dismissed and expired notifications
    return this.notifications
      .filter(n => !this.dismissedNotifications.has(n.id))
      .filter(n => !n.expiresAt || n.expiresAt > context.currentTime)
      .sort((a, b) => {
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
  }

  private checkSensorReminders(context: NotificationContext) {
    const { sensors, currentTime } = context;
    
    // Find active sensors that might need replacement soon
    const activeSensors = sensors.filter(sensor => {
      const daysSinceAdded = Math.floor(
        (currentTime.getTime() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceAdded < 14 && !sensor.is_problematic;
    });

    activeSensors.forEach(sensor => {
      const daysSinceAdded = Math.floor(
        (currentTime.getTime() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );

      // 7-day reminder
      if (daysSinceAdded === 7) {
        this.addNotification({
          id: `sensor-7day-${sensor.id}`,
          type: 'reminder',
          priority: 'medium',
          title: 'Sensor Check-in',
          message: `Your sensor (${sensor.serial_number}) has been active for 7 days. How is it performing?`,
          actionable: true,
          action: {
            label: 'Update Status',
            url: `/dashboard/sensors/${sensor.id}`
          },
          dismissible: true,
          conditions: {
            triggers: ['sensor-7-days'],
            frequency: 'once'
          },
          metadata: { sensorId: sensor.id, daysSinceAdded }
        });
      }

      // 10-day replacement reminder
      if (daysSinceAdded === 10) {
        this.addNotification({
          id: `sensor-replacement-${sensor.id}`,
          type: 'reminder',
          priority: 'high',
          title: 'Sensor Replacement Due',
          message: `Your sensor (${sensor.serial_number}) is due for replacement. Consider preparing a new one.`,
          actionable: true,
          action: {
            label: 'Add New Sensor',
            url: '/dashboard/sensors/new'
          },
          dismissible: true,
          conditions: {
            triggers: ['sensor-replacement-due'],
            frequency: 'once'
          },
          metadata: { sensorId: sensor.id, daysSinceAdded }
        });
      }

      // Overdue warning
      if (daysSinceAdded >= 14) {
        this.addNotification({
          id: `sensor-overdue-${sensor.id}`,
          type: 'warning',
          priority: 'urgent',
          title: 'Sensor Overdue for Replacement',
          message: `Your sensor (${sensor.serial_number}) is ${daysSinceAdded} days old and may be losing accuracy.`,
          actionable: true,
          action: {
            label: 'Replace Now',
            url: '/dashboard/sensors/new'
          },
          dismissible: false,
          conditions: {
            triggers: ['sensor-overdue'],
            frequency: 'daily'
          },
          metadata: { sensorId: sensor.id, daysSinceAdded }
        });
      }
    });
  }

  private checkSensorAlerts(context: NotificationContext) {
    const { sensors, currentTime } = context;
    
    // Check for recent problematic sensors
    const recentProblematic = sensors.filter(sensor => {
      const daysSinceAdded = Math.floor(
        (currentTime.getTime() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );
      return sensor.is_problematic && daysSinceAdded <= 7;
    });

    if (recentProblematic.length >= 2) {
      this.addNotification({
        id: 'multiple-failures',
        type: 'alert',
        priority: 'high',
        title: 'Multiple Sensor Issues Detected',
        message: `You've had ${recentProblematic.length} sensor issues in the past week. This might indicate a pattern.`,
        actionable: true,
        action: {
          label: 'Get Help',
          url: '/dashboard/help?section=troubleshooting'
        },
        dismissible: true,
        conditions: {
          triggers: ['multiple-sensor-failures'],
          frequency: 'weekly'
        },
        metadata: { failureCount: recentProblematic.length }
      });
    }

    // Check for no recent sensors
    const recentSensors = sensors.filter(sensor => {
      const daysSinceAdded = Math.floor(
        (currentTime.getTime() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceAdded <= 30;
    });

    if (sensors.length > 0 && recentSensors.length === 0) {
      this.addNotification({
        id: 'no-recent-sensors',
        type: 'reminder',
        priority: 'medium',
        title: 'No Recent Sensor Activity',
        message: 'It\'s been a while since you\'ve tracked a sensor. Don\'t forget to log your current one!',
        actionable: true,
        action: {
          label: 'Add Sensor',
          url: '/dashboard/sensors/new'
        },
        dismissible: true,
        conditions: {
          triggers: ['no-recent-activity'],
          frequency: 'weekly'
        }
      });
    }
  }

  private checkAchievementProgress(context: NotificationContext) {
    const { userStats } = context;
    
    if (!userStats) return;

    // Near achievement milestones
    const milestones = [5, 10, 25, 50, 100];
    const nextMilestone = milestones.find(m => m > userStats.sensors_tracked);
    
    if (nextMilestone && (nextMilestone - userStats.sensors_tracked) === 1) {
      this.addNotification({
        id: `achievement-near-${nextMilestone}`,
        type: 'celebration',
        priority: 'medium',
        title: 'Achievement Almost Unlocked!',
        message: `You're just 1 sensor away from the ${nextMilestone}-sensor milestone! 🎉`,
        actionable: true,
        action: {
          label: 'Add Sensor',
          url: '/dashboard/sensors/new'
        },
        dismissible: true,
        conditions: {
          triggers: ['achievement-near'],
          frequency: 'once'
        },
        metadata: { milestone: nextMilestone }
      });
    }

    // Streak celebrations
    if (userStats.current_streak > 0 && userStats.current_streak % 7 === 0) {
      this.addNotification({
        id: `streak-celebration-${userStats.current_streak}`,
        type: 'celebration',
        priority: 'low',
        title: 'Streak Milestone!',
        message: `Amazing! You're on a ${userStats.current_streak}-day tracking streak! 🔥`,
        actionable: false,
        dismissible: true,
        autoExpire: 24 * 60 * 60 * 1000, // 24 hours
        conditions: {
          triggers: ['streak-milestone'],
          frequency: 'once'
        },
        metadata: { streak: userStats.current_streak }
      });
    }
  }

  private checkHealthReminders(context: NotificationContext) {
    const { currentTime } = context;
    


    // Hygiene reminder
    const lastHygieneReminder = this.notificationHistory.get('hygiene-reminder');
    const daysSinceHygiene = lastHygieneReminder 
      ? Math.floor((currentTime.getTime() - lastHygieneReminder.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    if (daysSinceHygiene >= 30) {
      this.addNotification({
        id: 'hygiene-reminder',
        type: 'tip',
        priority: 'low',
        title: 'Sensor Care Tip',
        message: 'Keep your sensor site clean and dry for optimal performance and to prevent infections.',
        actionable: true,
        action: {
          label: 'Care Guidelines',
          url: '/dashboard/help?section=sensor-care'
        },
        dismissible: true,
        conditions: {
          triggers: ['hygiene-reminder'],
          frequency: 'weekly'
        }
      });
      
      this.notificationHistory.set('hygiene-reminder', currentTime);
    }
  }

  private checkEngagementTips(context: NotificationContext) {
    const { sensors, userStats, lastLogin, currentTime } = context;
    
    // Encourage analytics usage
    if (sensors.length >= 5 && userStats) {
      const lastAnalyticsReminder = this.notificationHistory.get('analytics-tip');
      const daysSinceReminder = lastAnalyticsReminder 
        ? Math.floor((currentTime.getTime() - lastAnalyticsReminder.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      if (daysSinceReminder >= 7) {
        this.addNotification({
          id: 'analytics-tip',
          type: 'tip',
          priority: 'low',
          title: 'Discover Your Patterns',
          message: 'With your sensor history, you can now view detailed analytics to optimize your CGM experience.',
          actionable: true,
          action: {
            label: 'View Analytics',
            url: '/dashboard/analytics'
          },
          dismissible: true,
          conditions: {
            triggers: ['analytics-encouragement'],
            frequency: 'weekly'
          }
        });
        
        this.notificationHistory.set('analytics-tip', currentTime);
      }
    }

    // Welcome back message for returning users
    if (lastLogin) {
      const daysSinceLogin = Math.floor(
        (currentTime.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLogin >= 7 && daysSinceLogin <= 30) {
        this.addNotification({
          id: 'welcome-back',
          type: 'celebration',
          priority: 'low',
          title: 'Welcome Back!',
          message: `Good to see you again! It's been ${daysSinceLogin} days since your last visit.`,
          actionable: false,
          dismissible: true,
          autoExpire: 24 * 60 * 60 * 1000, // 24 hours
          conditions: {
            triggers: ['welcome-back'],
            frequency: 'once'
          },
          metadata: { daysSinceLogin }
        });
      }
    }
  }

  private addNotification(notification: Omit<SmartNotification, 'createdAt' | 'expiresAt'>) {
    const fullNotification: SmartNotification = {
      ...notification,
      createdAt: new Date(),
      ...(notification.autoExpire 
        ? { expiresAt: new Date(Date.now() + notification.autoExpire) }
        : {})
    };

    // Check if we should show this notification based on frequency
    const lastShown = this.notificationHistory.get(notification.id);
    const shouldShow = this.shouldShowNotification(fullNotification, lastShown);

    if (shouldShow) {
      this.notifications.push(fullNotification);
      this.notificationHistory.set(notification.id, new Date());
    }
  }

  private shouldShowNotification(notification: SmartNotification, lastShown?: Date): boolean {
    if (!lastShown) return true;

    const daysSinceShown = Math.floor(
      (Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (notification.conditions.frequency) {
      case 'once':
        return false; // Already shown
      case 'daily':
        return daysSinceShown >= 1;
      case 'weekly':
        return daysSinceShown >= 7;
      case 'on-condition':
        return true; // Always check conditions
      default:
        return true;
    }
  }

  dismissNotification(notificationId: string) {
    this.dismissedNotifications.add(notificationId);
  }

  clearDismissed() {
    this.dismissedNotifications.clear();
  }

  getNotificationHistory() {
    return Array.from(this.notificationHistory.entries());
  }
}

// Singleton instance
export const smartNotificationEngine = new SmartNotificationEngine();

// Hook for using smart notifications
export function useSmartNotifications(context: NotificationContext) {
  const [notifications, setNotifications] = React.useState<SmartNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const generateNotifications = () => {
      setLoading(true);
      try {
        const newNotifications = smartNotificationEngine.generateNotifications(context);
        setNotifications(newNotifications);
      } catch (error) {
        console.error('Error generating notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    generateNotifications();
  }, [context.sensors.length, context.userStats?.sensors_tracked, context.currentTime.getDate()]);

  const dismissNotification = React.useCallback((notificationId: string) => {
    smartNotificationEngine.dismissNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  return { notifications, loading, dismissNotification };
}

// Import React for the hook
import React from 'react';