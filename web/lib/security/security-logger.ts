import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SecurityEvent {
  type: 'failed_login' | 'suspicious_activity' | 'admin_action' | 'data_access' | 'system_error';
  severity: 'low' | 'medium' | 'high';
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class SecurityLogger {
  static async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // Use the database function for better performance and consistency
      const { error } = await supabase.rpc('log_security_event', {
        p_level: event.severity === 'high' ? 'error' : event.severity === 'medium' ? 'warn' : 'info',
        p_category: 'security',
        p_message: event.message,
        p_user_hash: event.userId ? `user_${event.userId.slice(0, 8)}` : null,
        p_metadata: {
          type: event.type,
          severity: event.severity,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          timestamp: new Date().toISOString(),
          ...event.metadata
        }
      });

      if (error) {
        console.error('Failed to log security event:', error);
        // Fallback to direct insert
        const { error: insertError } = await supabase
          .from('system_logs')
          .insert({
            level: event.severity === 'high' ? 'error' : event.severity === 'medium' ? 'warn' : 'info',
            category: 'security',
            message: event.message,
            user_hash: event.userId ? `user_${event.userId.slice(0, 8)}` : null,
            metadata: {
              type: event.type,
              severity: event.severity,
              ipAddress: event.ipAddress,
              userAgent: event.userAgent,
              timestamp: new Date().toISOString(),
              ...event.metadata
            }
          });
        
        if (insertError) {
          console.error('Fallback insert also failed:', insertError);
          // Final fallback to console logging
          console.log('SECURITY EVENT:', {
            timestamp: new Date().toISOString(),
            ...event
          });
        }
      }
    } catch (error) {
      console.error('Security logging error:', error);
      // Always fallback to console
      console.log('SECURITY EVENT:', {
        timestamp: new Date().toISOString(),
        ...event
      });
    }
  }

  static async logFailedLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      type: 'failed_login',
      severity: 'medium',
      message: `Failed login attempt for user ${userId}`,
      userId,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown'
    });
  }

  static async logSuspiciousActivity(userId: string, activity: string, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      type: 'suspicious_activity',
      severity: 'high',
      message: `Suspicious activity detected: ${activity}`,
      userId,
      metadata: metadata || {}
    });
  }

  static async logAdminAction(adminId: string, action: string, targetUserId?: string): Promise<void> {
    await this.logEvent({
      type: 'admin_action',
      severity: 'low',
      message: `Admin action: ${action}`,
      userId: adminId,
      metadata: {
        targetUserId,
        action
      }
    });
  }

  static async logDataAccess(userId: string, resource: string, action: string): Promise<void> {
    await this.logEvent({
      type: 'data_access',
      severity: 'low',
      message: `Data access: ${action} on ${resource}`,
      userId,
      metadata: {
        resource,
        action
      }
    });
  }
}

// Utility functions for security analysis
export class SecurityAnalyzer {
  static async detectSuspiciousUserActivity(userId: string, timeWindowHours: number = 1): Promise<boolean> {
    try {
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - timeWindowHours);

      // Check for excessive sensor creation
      const { data: recentSensors } = await supabase
        .from('sensors')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', timeAgo.toISOString());

      if (recentSensors && recentSensors.length > 10) {
        await SecurityLogger.logSuspiciousActivity(
          userId,
          `Excessive sensor creation: ${recentSensors.length} sensors in ${timeWindowHours} hour(s)`,
          { sensorCount: recentSensors.length, timeWindow: timeWindowHours }
        );
        return true;
      }

      // Check for rapid profile updates
      const { data: profile } = await supabase
        .from('profiles')
        .select('updated_at')
        .eq('id', userId)
        .single();

      if (profile && new Date(profile.updated_at) > timeAgo) {
        // Could add more sophisticated checks here
      }

      return false;
    } catch (error) {
      console.error('Error analyzing user activity:', error);
      return false;
    }
  }

  static async getSecurityMetrics(hours: number = 24): Promise<{
    failedLogins: number;
    suspiciousActivity: number;
    adminActions: number;
    dataAccess: number;
  }> {
    try {
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - hours);

      const { data: logs } = await supabase
        .from('system_logs')
        .select('metadata')
        .eq('category', 'security')
        .gte('created_at', timeAgo.toISOString());

      const metrics = {
        failedLogins: 0,
        suspiciousActivity: 0,
        adminActions: 0,
        dataAccess: 0
      };

      logs?.forEach(log => {
        const metadata = log.metadata as any;
        if (metadata?.type) {
          switch (metadata.type) {
            case 'failed_login':
              metrics.failedLogins++;
              break;
            case 'suspicious_activity':
              metrics.suspiciousActivity++;
              break;
            case 'admin_action':
              metrics.adminActions++;
              break;
            case 'data_access':
              metrics.dataAccess++;
              break;
          }
        }
      });

      return metrics;
    } catch (error) {
      console.error('Error getting security metrics:', error);
      return {
        failedLogins: 0,
        suspiciousActivity: 0,
        adminActions: 0,
        dataAccess: 0
      };
    }
  }
}

export default SecurityLogger;