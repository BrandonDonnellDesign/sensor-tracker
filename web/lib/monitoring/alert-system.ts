// Enhanced monitoring and alerting system
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Alert {
  id: string;
  type: 'performance' | 'security' | 'system' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: string;
  threshold: number;
  severity: Alert['severity'];
  enabled: boolean;
  cooldown: number; // minutes
}

export class AlertSystem {
  private static instance: AlertSystem;
  private alertRules: AlertRule[] = [
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      type: 'system',
      condition: 'error_rate > threshold',
      threshold: 5, // 5% error rate
      severity: 'high',
      enabled: true,
      cooldown: 15
    },
    {
      id: 'slow-performance',
      name: 'Slow Performance',
      type: 'performance',
      condition: 'avg_response_time > threshold',
      threshold: 2000, // 2 seconds
      severity: 'medium',
      enabled: true,
      cooldown: 10
    },
    {
      id: 'suspicious-activity',
      name: 'Suspicious User Activity',
      type: 'security',
      condition: 'failed_logins > threshold',
      threshold: 10, // 10 failed logins in 1 hour
      severity: 'high',
      enabled: true,
      cooldown: 30
    },
    {
      id: 'low-retention',
      name: 'Low User Retention',
      type: 'user',
      condition: 'weekly_retention < threshold',
      threshold: 50, // 50% retention
      severity: 'medium',
      enabled: true,
      cooldown: 60
    }
  ];

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  async checkAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateRule(rule);
        if (shouldAlert) {
          const alert = await this.createAlert(rule);
          if (alert) alerts.push(alert);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    return alerts;
  }

  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    // Check if we're in cooldown period
    const recentAlert = await this.getRecentAlert(rule.id, rule.cooldown);
    if (recentAlert) return false;

    switch (rule.id) {
      case 'high-error-rate':
        return await this.checkErrorRate(rule.threshold);
      case 'slow-performance':
        return await this.checkPerformance(rule.threshold);
      case 'suspicious-activity':
        return await this.checkSuspiciousActivity(rule.threshold);
      case 'low-retention':
        return await this.checkRetention(rule.threshold);
      default:
        return false;
    }
  }

  private async checkErrorRate(threshold: number): Promise<boolean> {
    try {
      // Check system logs for error rate in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: logs } = await supabase
        .from('system_logs')
        .select('level')
        .gte('created_at', oneHourAgo);

      if (!logs || logs.length === 0) return false;

      const errorCount = logs.filter(log => log.level === 'error').length;
      const errorRate = (errorCount / logs.length) * 100;

      return errorRate > threshold;
    } catch {
      return false;
    }
  }

  private async checkPerformance(threshold: number): Promise<boolean> {
    try {
      // Check web vitals for average response time
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: vitals } = await supabase
        .from('web_vitals')
        .select('metric_value')
        .eq('metric_name', 'LCP')
        .gte('timestamp', oneHourAgo);

      if (!vitals || vitals.length === 0) return false;

      const avgResponseTime = vitals.reduce((sum, v) => sum + parseFloat(v.metric_value), 0) / vitals.length;
      return avgResponseTime > threshold;
    } catch {
      return false;
    }
  }

  private async checkSuspiciousActivity(threshold: number): Promise<boolean> {
    try {
      // Use security events API to check for suspicious activity
      const response = await fetch('/api/admin/security-events?hours=1');
      if (!response.ok) return false;

      const data = await response.json();
      const suspiciousEvents = data.events?.filter((e: any) => 
        e.type === 'suspicious_activity' || e.severity === 'high'
      ) || [];

      return suspiciousEvents.length > threshold;
    } catch {
      return false;
    }
  }

  private async checkRetention(threshold: number): Promise<boolean> {
    try {
      // Check admin metrics for retention rate
      const response = await fetch('/api/admin/metrics');
      if (!response.ok) return false;

      const data = await response.json();
      return data.retention?.weeklyRetention < threshold;
    } catch {
      return false;
    }
  }

  private async getRecentAlert(ruleId: string, cooldownMinutes: number): Promise<boolean> {
    try {
      const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
      
      const { data } = await supabase
        .from('system_logs')
        .select('id')
        .eq('category', 'alert')
        .eq('metadata->rule_id', ruleId)
        .gte('created_at', cooldownTime)
        .limit(1);

      return (data?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  private async createAlert(rule: AlertRule): Promise<Alert | null> {
    try {
      const alert: Alert = {
        id: `alert_${rule.id}_${Date.now()}`,
        type: rule.type,
        severity: rule.severity,
        title: rule.name,
        message: `Alert triggered: ${rule.name} (${rule.condition})`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { rule_id: rule.id, threshold: rule.threshold }
      };

      // Log the alert to system_logs
      await supabase
        .from('system_logs')
        .insert({
          level: rule.severity === 'critical' ? 'error' : 'warning',
          category: 'alert',
          message: alert.message,
          metadata: alert.metadata
        });

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .eq('category', 'alert')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      return (logs || []).map(log => ({
        id: log.id,
        type: log.metadata?.type || 'system',
        severity: log.level === 'error' ? 'critical' : 'medium',
        title: log.metadata?.title || 'System Alert',
        message: log.message,
        timestamp: log.created_at,
        resolved: false,
        metadata: log.metadata
      }));
    } catch {
      return [];
    }
  }
}

export const alertSystem = AlertSystem.getInstance();