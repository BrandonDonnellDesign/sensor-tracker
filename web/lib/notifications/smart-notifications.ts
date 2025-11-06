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
  // Enhanced context for IOB and glucose alerts
  insulinDoses?: Array<{
    id: string;
    amount: number;
    type: string;
    timestamp: Date;
    duration: number;
  }>;
  currentGlucose?: number | undefined;
  glucoseReadings?: Array<{
    id: string;
    value: number;
    timestamp: Date;
    trend?: string | undefined;
  }>;
  foodLogs?: Array<{
    id: string;
    logged_at: string;
    total_carbs_g?: number;
  }>;
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
    
    // IOB Safety notifications (Phase 1A)
    this.checkIOBSafetyWarnings(context);
    
    // Glucose-based alerts (Phase 1B)
    this.checkGlucoseBasedAlerts(context);
    
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

  // Phase 1A: IOB Safety Warnings
  private checkIOBSafetyWarnings(context: NotificationContext) {
    const { insulinDoses, currentGlucose, currentTime } = context;
    
    if (!insulinDoses || insulinDoses.length === 0) return;

    // Calculate current IOB
    const now = currentTime.getTime();
    let totalIOB = 0;
    let activeDoses = 0;
    let recentDoses = 0; // Doses in last 2 hours

    insulinDoses.forEach(dose => {
      const hoursElapsed = (now - dose.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed < dose.duration && hoursElapsed >= 0) {
        // Simple linear decay for notification purposes
        const remainingPercentage = Math.max(0, (dose.duration - hoursElapsed) / dose.duration);
        const remainingInsulin = dose.amount * remainingPercentage;
        
        if (remainingInsulin > 0.1) {
          totalIOB += remainingInsulin;
          activeDoses++;
        }
        
        if (hoursElapsed < 2) {
          recentDoses++;
        }
      }
    });

    // 1. Insulin Stacking Detection (multiple doses in short period)
    if (recentDoses >= 2 && totalIOB > 3) {
      this.addNotification({
        id: 'insulin-stacking-warning',
        type: 'warning',
        priority: 'urgent',
        title: '⚠️ Insulin Stacking Detected',
        message: `You have ${recentDoses} recent doses with ${totalIOB.toFixed(1)}u IOB. Risk of hypoglycemia!`,
        actionable: true,
        action: {
          label: 'Check IOB',
          url: '/dashboard/insulin'
        },
        dismissible: true,
        autoExpire: 2 * 60 * 60 * 1000, // 2 hours
        conditions: {
          triggers: ['insulin-stacking'],
          frequency: 'on-condition'
        },
        confidence: 0.9,
        metadata: { totalIOB, recentDoses, activeDoses }
      });
    }

    // 2. High IOB with Low Glucose Warning
    if (currentGlucose && currentGlucose < 100 && totalIOB > 2) {
      this.addNotification({
        id: 'high-iob-low-glucose',
        type: 'alert',
        priority: 'urgent',
        title: '🚨 High IOB + Low Glucose',
        message: `Glucose: ${currentGlucose} mg/dL with ${totalIOB.toFixed(1)}u IOB. Consider having carbs!`,
        actionable: true,
        action: {
          label: 'Log Food',
          url: '/dashboard/food'
        },
        dismissible: true,
        autoExpire: 30 * 60 * 1000, // 30 minutes
        conditions: {
          triggers: ['high-iob-low-glucose'],
          frequency: 'on-condition'
        },
        confidence: 0.95,
        metadata: { glucose: currentGlucose, totalIOB }
      });
    }

    // 3. Very High IOB Warning (>5 units)
    if (totalIOB > 5) {
      this.addNotification({
        id: 'very-high-iob',
        type: 'warning',
        priority: 'high',
        title: '⚠️ Very High IOB',
        message: `You have ${totalIOB.toFixed(1)} units of insulin on board. Monitor glucose closely.`,
        actionable: true,
        action: {
          label: 'View IOB Details',
          url: '/dashboard/insulin'
        },
        dismissible: true,
        autoExpire: 60 * 60 * 1000, // 1 hour
        conditions: {
          triggers: ['very-high-iob'],
          frequency: 'on-condition'
        },
        confidence: 0.8,
        metadata: { totalIOB, activeDoses }
      });
    }
  }

  // Phase 1B: Glucose-Based Alerts
  private checkGlucoseBasedAlerts(context: NotificationContext) {
    const { currentGlucose, glucoseReadings, foodLogs, insulinDoses, currentTime } = context;
    
    if (!currentGlucose || !glucoseReadings) return;

    const now = currentTime.getTime();
    const recentReadings = glucoseReadings
      .filter(r => (now - r.timestamp.getTime()) < 3 * 60 * 60 * 1000) // Last 3 hours
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 1. Rising Glucose Without Logged Food
    if (recentReadings.length >= 3) {
      const trend = this.calculateGlucoseTrend(recentReadings.slice(0, 3));
      const recentFood = foodLogs?.filter(f => 
        (now - new Date(f.logged_at).getTime()) < 2 * 60 * 60 * 1000 // Last 2 hours
      ) || [];

      if (trend === 'rising' && currentGlucose > 140 && recentFood.length === 0) {
        this.addNotification({
          id: 'rising-glucose-no-food',
          type: 'alert',
          priority: 'high',
          title: '📈 Rising Glucose Detected',
          message: `Glucose rising to ${currentGlucose} mg/dL with no recent food logged. Did you eat something?`,
          actionable: true,
          action: {
            label: 'Log Food',
            url: '/dashboard/food'
          },
          dismissible: true,
          autoExpire: 60 * 60 * 1000, // 1 hour
          conditions: {
            triggers: ['rising-glucose-no-food'],
            frequency: 'on-condition'
          },
          confidence: 0.7,
          metadata: { glucose: currentGlucose, trend, recentFoodCount: recentFood.length }
        });
      }
    }

    // 2. Prolonged High Glucose
    const highReadings = recentReadings.filter(r => r.value > 180);
    if (highReadings.length >= 3 && currentGlucose > 200) {
      const recentInsulin = insulinDoses?.filter(d => 
        (now - d.timestamp.getTime()) < 2 * 60 * 60 * 1000 // Last 2 hours
      ) || [];

      if (recentInsulin.length === 0) {
        this.addNotification({
          id: 'prolonged-high-glucose',
          type: 'warning',
          priority: 'high',
          title: '⚠️ Prolonged High Glucose',
          message: `Glucose has been >180 mg/dL for extended period. Current: ${currentGlucose} mg/dL. Consider correction.`,
          actionable: true,
          action: {
            label: 'Calculate Correction',
            url: '/dashboard/insulin'
          },
          dismissible: true,
          autoExpire: 2 * 60 * 60 * 1000, // 2 hours
          conditions: {
            triggers: ['prolonged-high-glucose'],
            frequency: 'on-condition'
          },
          confidence: 0.85,
          metadata: { glucose: currentGlucose, highReadingsCount: highReadings.length }
        });
      }
    }

    // 3. Dawn Phenomenon Detection
    const currentHour = currentTime.getHours();
    if (currentHour >= 5 && currentHour <= 9) { // Dawn hours
      const morningReadings = recentReadings.filter(r => {
        const hour = r.timestamp.getHours();
        return hour >= 5 && hour <= 9;
      });

      if (morningReadings.length >= 2) {
        const avgMorning = morningReadings.reduce((sum, r) => sum + r.value, 0) / morningReadings.length;
        
        if (avgMorning > 140 && currentGlucose > 150) {
          this.addNotification({
            id: 'dawn-phenomenon',
            type: 'tip',
            priority: 'medium',
            title: '🌅 Dawn Phenomenon Detected',
            message: `Morning glucose elevated (${currentGlucose} mg/dL). This is common due to natural hormone changes.`,
            actionable: true,
            action: {
              label: 'Learn More',
              url: '/dashboard/help?section=dawn-phenomenon'
            },
            dismissible: true,
            autoExpire: 4 * 60 * 60 * 1000, // 4 hours
            conditions: {
              triggers: ['dawn-phenomenon'],
              frequency: 'daily'
            },
            confidence: 0.6,
            metadata: { glucose: currentGlucose, avgMorning, hour: currentHour }
          });
        }
      }
    }

    // 4. Low Glucose with Active IOB
    if (currentGlucose < 80) {
      const totalIOB = this.calculateCurrentIOB(insulinDoses || [], currentTime);
      
      if (totalIOB > 1) {
        this.addNotification({
          id: 'low-glucose-active-iob',
          type: 'alert',
          priority: 'urgent',
          title: '🚨 Low Glucose + Active IOB',
          message: `Glucose: ${currentGlucose} mg/dL with ${totalIOB.toFixed(1)}u IOB. Treat low and monitor closely!`,
          actionable: true,
          action: {
            label: 'Treatment Guide',
            url: '/dashboard/help?section=hypoglycemia'
          },
          dismissible: true,
          autoExpire: 15 * 60 * 1000, // 15 minutes
          conditions: {
            triggers: ['low-glucose-active-iob'],
            frequency: 'on-condition'
          },
          confidence: 0.95,
          metadata: { glucose: currentGlucose, totalIOB }
        });
      }
    }
  }

  // Helper method to calculate glucose trend
  private calculateGlucoseTrend(readings: Array<{ value: number; timestamp: Date }>): 'rising' | 'falling' | 'stable' {
    if (readings.length < 2) return 'stable';
    
    const recent = readings[0].value;
    const older = readings[readings.length - 1].value;
    const change = recent - older;
    
    if (change > 20) return 'rising';
    if (change < -20) return 'falling';
    return 'stable';
  }

  // Helper method to calculate current IOB
  private calculateCurrentIOB(doses: Array<{ amount: number; timestamp: Date; duration: number }>, currentTime: Date): number {
    const now = currentTime.getTime();
    let totalIOB = 0;

    doses.forEach(dose => {
      const hoursElapsed = (now - dose.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed < dose.duration && hoursElapsed >= 0) {
        const remainingPercentage = Math.max(0, (dose.duration - hoursElapsed) / dose.duration);
        totalIOB += dose.amount * remainingPercentage;
      }
    });

    return Math.round(totalIOB * 100) / 100;
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

// Hook for using smart notifications with enhanced context
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
  }, [
    context.sensors.length, 
    context.userStats?.sensors_tracked, 
    context.currentTime.getDate(),
    context.currentGlucose,
    context.insulinDoses?.length,
    context.glucoseReadings?.length,
    context.foodLogs?.length
  ]);

  const dismissNotification = React.useCallback((notificationId: string) => {
    smartNotificationEngine.dismissNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  return { notifications, loading, dismissNotification };
}

// Import React for the hook
import React from 'react';