import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

export interface UserAchievement {
  id: string;
  user_id?: string;
  achievement_id?: string;
  earned_at?: string;
  achievement?: {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    badge_color: string;
  };
}

export interface InsightData {
  sensors: Sensor[];
  userAchievements: UserAchievement[];
  userStats?: {
    total_points: number;
    level: number;
    current_streak: number;
    sensors_tracked: number;
  } | null;
}

export interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  category: 'performance' | 'health' | 'optimization' | 'achievement' | 'prediction';
  title: string;
  description: string;
  actionable: boolean;
  action?: {
    label: string;
    url?: string;
    handler?: () => void;
  };
  priority: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 score
  metadata?: Record<string, any>;
}

export class InsightsEngine {
  private insights: Insight[] = [];

  generateInsights(data: InsightData): Insight[] {
    this.insights = [];
    
    // Performance insights
    this.analyzePerformancePatterns(data);
    
    // Health insights
    this.analyzeHealthPatterns(data);
    
    // Optimization insights
    this.analyzeOptimizationOpportunities(data);
    
    // Achievement insights
    this.analyzeAchievementProgress(data);
    
    // Predictive insights
    this.generatePredictiveInsights(data);
    
    // Sort by priority and confidence
    return this.insights.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.confidence - a.confidence;
    });
  }

  private analyzePerformancePatterns(data: InsightData) {
    const { sensors } = data;
    
    if (sensors.length === 0) return;

    // Analyze sensor success rate
    const problematicSensors = sensors.filter(s => s.is_problematic);
    const successRate = ((sensors.length - problematicSensors.length) / sensors.length) * 100;
    
    if (successRate < 70) {
      this.addInsight({
        id: 'low-success-rate',
        type: 'warning',
        category: 'performance',
        title: 'Low Sensor Success Rate Detected',
        description: `Your sensor success rate is ${successRate.toFixed(1)}%. This is below the optimal range of 85-95%.`,
        actionable: true,
        action: {
          label: 'View Troubleshooting Guide',
          url: '/dashboard/help?section=troubleshooting'
        },
        priority: 'high',
        confidence: 0.9,
        metadata: { successRate, problematicCount: problematicSensors.length }
      });
    } else if (successRate > 90) {
      this.addInsight({
        id: 'excellent-success-rate',
        type: 'success',
        category: 'performance',
        title: 'Excellent Sensor Performance!',
        description: `Outstanding! Your sensor success rate is ${successRate.toFixed(1)}%. You're in the top 10% of users.`,
        actionable: false,
        priority: 'medium',
        confidence: 0.95,
        metadata: { successRate }
      });
    }

    // Analyze sensor duration patterns
    this.analyzeSensorDurationPatterns(sensors);
    
    // Analyze failure patterns
    this.analyzeFailurePatterns(problematicSensors);
  }

  private analyzeSensorDurationPatterns(sensors: Sensor[]) {
    if (sensors.length < 3) return;

    const recentSensors = sensors
      .filter(s => new Date(s.date_added) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());

    if (recentSensors.length < 3) return;

    // Check for early failures
    const earlyFailures = recentSensors.filter(s => {
      if (!s.is_problematic) return false;
      const daysSinceAdded = Math.floor(
        (Date.now() - new Date(s.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceAdded < 3;
    });

    if (earlyFailures.length >= 2) {
      this.addInsight({
        id: 'early-failure-pattern',
        type: 'warning',
        category: 'performance',
        title: 'Early Sensor Failure Pattern Detected',
        description: `${earlyFailures.length} of your recent sensors failed within 3 days. This might indicate insertion technique or site selection issues.`,
        actionable: true,
        action: {
          label: 'Learn Best Practices',
          url: '/dashboard/help?section=insertion-tips'
        },
        priority: 'high',
        confidence: 0.85,
        metadata: { earlyFailureCount: earlyFailures.length }
      });
    }
  }

  private analyzeFailurePatterns(problematicSensors: Sensor[]) {
    if (problematicSensors.length === 0) return;

    // Analyze common failure reasons
    const failureReasons = problematicSensors
      .map(s => s.issue_notes)
      .filter(Boolean)
      .map(note => note!.toLowerCase());

    const commonIssues = this.findCommonPatterns(failureReasons);
    
    if (commonIssues.length > 0) {
      const topIssue = commonIssues[0];
      this.addInsight({
        id: 'common-failure-pattern',
        type: 'info',
        category: 'optimization',
        title: 'Common Issue Pattern Identified',
        description: `Your most common sensor issue appears to be related to "${topIssue.pattern}". This accounts for ${topIssue.frequency} occurrences.`,
        actionable: true,
        action: {
          label: 'Get Targeted Help',
          url: `/dashboard/help?issue=${encodeURIComponent(topIssue.pattern)}`
        },
        priority: 'medium',
        confidence: 0.75,
        metadata: { commonIssues }
      });
    }
  }

  private analyzeHealthPatterns(data: InsightData) {
    const { sensors } = data;
    
    // Analyze sensor replacement timing
    this.analyzeSensorReplacementTiming(sensors);
  }

  private analyzeSensorReplacementTiming(sensors: Sensor[]) {
    if (sensors.length < 2) return;

    // Calculate sensor durations based on how long each sensor was actually used
    const sensorDurations: number[] = [];
    const currentTime = new Date();

    sensors.forEach(sensor => {
      const startDate = new Date(sensor.date_added);
      
      // For problematic sensors, calculate how long they lasted before failing
      if (sensor.is_problematic) {
        // Assume problematic sensors failed after a few days (estimate based on when they were marked problematic)
        // Since we don't have exact failure date, estimate based on typical failure patterns
        const daysSinceAdded = Math.floor((currentTime.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If it's a recent problematic sensor (within 14 days), assume it failed early
        if (daysSinceAdded <= 14) {
          // Estimate it failed around 3-5 days (typical early failure)
          const estimatedDuration = Math.min(daysSinceAdded, 5);
          if (estimatedDuration >= 1) {
            sensorDurations.push(estimatedDuration);
          }
        }
      } else {
        // For successful sensors, calculate actual duration
        const daysSinceAdded = Math.floor((currentTime.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If sensor is older than 14 days, assume it was used for the full recommended duration
        if (daysSinceAdded > 14) {
          sensorDurations.push(14); // Assume full 14-day usage for old successful sensors
        } else if (daysSinceAdded >= 7) {
          // For sensors 7-14 days old, use actual age (might still be active)
          sensorDurations.push(daysSinceAdded);
        }
        // Skip very recent sensors (< 7 days) as they're likely still active
      }
    });

    if (sensorDurations.length === 0) return;

    const avgDuration = sensorDurations.reduce((a, b) => a + b, 0) / sensorDurations.length;
    
    if (avgDuration < 7) {
      this.addInsight({
        id: 'short-sensor-duration',
        type: 'warning',
        category: 'health',
        title: 'Short Sensor Duration',
        description: `Your sensors are lasting ${avgDuration.toFixed(1)} days on average. The recommended duration is 10-14 days.`,
        actionable: true,
        action: {
          label: 'Optimization Tips',
          url: '/dashboard/help?section=sensor-longevity'
        },
        priority: 'medium',
        confidence: 0.8,
        metadata: { avgDuration, durations: sensorDurations, sampleSize: sensorDurations.length }
      });
    } else if (avgDuration >= 10) {
      this.addInsight({
        id: 'optimal-sensor-duration',
        type: 'success',
        category: 'health',
        title: 'Excellent Sensor Duration',
        description: `Great job! Your sensors are lasting ${avgDuration.toFixed(1)} days on average, which is excellent longevity.`,
        actionable: false,
        priority: 'low',
        confidence: 0.9,
        metadata: { avgDuration, durations: sensorDurations, sampleSize: sensorDurations.length }
      });
    }
  }



  private analyzeOptimizationOpportunities(data: InsightData) {
    const { sensors, userStats } = data;
    
    // Suggest tracking improvements
    if (sensors.length > 0 && sensors.length < 5) {
      this.addInsight({
        id: 'tracking-consistency',
        type: 'tip',
        category: 'optimization',
        title: 'Improve Tracking Consistency',
        description: 'Adding more detailed notes about your sensors can help identify patterns and improve your CGM experience.',
        actionable: true,
        action: {
          label: 'Add Sensor Notes',
          url: '/dashboard/sensors'
        },
        priority: 'low',
        confidence: 0.6
      });
    }

    // Suggest feature usage
    if (userStats && userStats.sensors_tracked >= 5) {
      this.addInsight({
        id: 'analytics-suggestion',
        type: 'info',
        category: 'optimization',
        title: 'Unlock Advanced Analytics',
        description: 'With your sensor history, you can now access detailed analytics and trends to optimize your CGM management.',
        actionable: true,
        action: {
          label: 'View Analytics',
          url: '/dashboard/analytics'
        },
        priority: 'medium',
        confidence: 0.8
      });
    }
  }

  private analyzeAchievementProgress(data: InsightData) {
    const { userStats, userAchievements: _userAchievements } = data;
    
    if (!userStats) return;

    // Check for near achievements
    const sensorsTracked = userStats.sensors_tracked;
    const nextMilestones = [5, 10, 25, 50, 100];
    const nextMilestone = nextMilestones.find(m => m > sensorsTracked);
    
    if (nextMilestone && (nextMilestone - sensorsTracked) <= 2) {
      this.addInsight({
        id: 'achievement-near',
        type: 'info',
        category: 'achievement',
        title: 'Achievement Almost Unlocked!',
        description: `You're only ${nextMilestone - sensorsTracked} sensor${nextMilestone - sensorsTracked === 1 ? '' : 's'} away from unlocking a new achievement milestone!`,
        actionable: true,
        action: {
          label: 'Add Sensor',
          url: '/dashboard/sensors/new'
        },
        priority: 'medium',
        confidence: 0.9,
        metadata: { nextMilestone, sensorsTracked }
      });
    }

    // Streak encouragement
    if (userStats.current_streak >= 7) {
      this.addInsight({
        id: 'streak-celebration',
        type: 'success',
        category: 'achievement',
        title: 'Amazing Streak!',
        description: `You're on a ${userStats.current_streak}-day tracking streak! Keep it up to unlock streak-based achievements.`,
        actionable: false,
        priority: 'low',
        confidence: 0.95,
        metadata: { streak: userStats.current_streak }
      });
    }
  }

  private generatePredictiveInsights(data: InsightData) {
    const { sensors } = data;
    
    if (sensors.length < 3) return;

    // Predict next sensor replacement
    const activeSensors = sensors.filter(s => {
      const daysSinceAdded = Math.floor(
        (Date.now() - new Date(s.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceAdded < 14 && !s.is_problematic;
    });

    if (activeSensors.length > 0) {
      const oldestActive = activeSensors.reduce((oldest, current) => 
        new Date(current.date_added) < new Date(oldest.date_added) ? current : oldest
      );

      const daysSinceAdded = Math.floor(
        (Date.now() - new Date(oldestActive.date_added).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceAdded >= 8) {
        this.addInsight({
          id: 'replacement-prediction',
          type: 'info',
          category: 'prediction',
          title: 'Sensor Replacement Due Soon',
          description: `Your current sensor (added ${daysSinceAdded} days ago) may need replacement within the next 2-4 days.`,
          actionable: true,
          action: {
            label: 'Prepare New Sensor',
            url: '/dashboard/sensors/new'
          },
          priority: 'medium',
          confidence: 0.75,
          metadata: { daysSinceAdded, sensorId: oldestActive.id }
        });
      }
    }
  }

  private findCommonPatterns(texts: string[]): Array<{ pattern: string; frequency: number }> {
    const patterns = new Map<string, number>();
    
    // Simple keyword extraction
    const keywords = ['adhesive', 'bleeding', 'pain', 'accuracy', 'error', 'fell off', 'irritation', 'rash'];
    
    texts.forEach(text => {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          patterns.set(keyword, (patterns.get(keyword) || 0) + 1);
        }
      });
    });

    return Array.from(patterns.entries())
      .map(([pattern, frequency]) => ({ pattern, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private addInsight(insight: Omit<Insight, 'id'> & { id: string }) {
    // Avoid duplicate insights
    if (!this.insights.find(i => i.id === insight.id)) {
      this.insights.push(insight);
    }
  }
}

// Singleton instance
export const insightsEngine = new InsightsEngine();

// Hook for using insights in components
export function useInsights(data: InsightData) {
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const generateInsights = async () => {
      setLoading(true);
      try {
        const newInsights = insightsEngine.generateInsights(data);
        setInsights(newInsights);
      } catch (error) {
        console.error('Error generating insights:', error);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, [data.sensors.length, data.userAchievements.length, data.userStats?.sensors_tracked]);

  return { insights, loading };
}

// Import React for the hook
import React from 'react';