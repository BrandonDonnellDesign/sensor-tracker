// Security event logger for generating real-time security events
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SecurityEventContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, any>;
}

export class SecurityEventLogger {
  private static instance: SecurityEventLogger;

  static getInstance(): SecurityEventLogger {
    if (!SecurityEventLogger.instance) {
      SecurityEventLogger.instance = new SecurityEventLogger();
    }
    return SecurityEventLogger.instance;
  }

  // Log authentication events
  async logAuthEvent(
    type: 'login_success' | 'login_failed' | 'logout' | 'password_reset',
    context: SecurityEventContext
  ): Promise<void> {
    const severity = type === 'login_failed' ? 'warn' : 'info';
    const message = this.getAuthMessage(type, context);

    await this.logEvent(severity, 'security', message, context);

    // Check for brute force patterns
    if (type === 'login_failed') {
      await this.checkBruteForcePattern(context);
    }
  }

  // Log user behavior events
  async logBehaviorEvent(
    type: 'bulk_creation' | 'rapid_updates' | 'unusual_pattern' | 'suspicious_activity',
    context: SecurityEventContext
  ): Promise<void> {
    const severity = this.getBehaviorSeverity(type, context);
    const message = this.getBehaviorMessage(type, context);

    await this.logEvent(severity, 'security', message, context);
  }

  // Log data access events
  async logDataAccessEvent(
    type: 'bulk_read' | 'unauthorized_access' | 'data_export' | 'admin_action',
    context: SecurityEventContext
  ): Promise<void> {
    const severity = type === 'unauthorized_access' ? 'error' : 'info';
    const message = this.getDataAccessMessage(type, context);

    await this.logEvent(severity, 'security', message, context);
  }

  // Log system events
  async logSystemEvent(
    type: 'security_scan' | 'policy_violation' | 'system_error' | 'maintenance',
    context: SecurityEventContext
  ): Promise<void> {
    const severity = type === 'policy_violation' ? 'warn' : 'info';
    const message = this.getSystemMessage(type, context);

    await this.logEvent(severity, 'security', message, context);
  }

  // Generic event logging
  private async logEvent(
    level: 'info' | 'warn' | 'error',
    category: string,
    message: string,
    context: SecurityEventContext
  ): Promise<void> {
    try {
      const userHash = context.userId ? `user_${context.userId.substring(0, 8)}` : 'system';
      
      const metadata = {
        action: context.action,
        resource: context.resource,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        timestamp: new Date().toISOString(),
        ...context.metadata
      };

      await supabase.rpc('log_security_event', {
        p_level: level,
        p_category: category,
        p_message: message,
        p_user_hash: userHash,
        p_metadata: metadata
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Check for brute force attack patterns
  private async checkBruteForcePattern(context: SecurityEventContext): Promise<void> {
    if (!context.ipAddress) return;

    try {
      // Count recent failed attempts from this IP
      const { data: recentFailures } = await supabase
        .from('system_logs')
        .select('id')
        .eq('category', 'security')
        .eq('level', 'warn')
        .like('message', '%login_failed%')
        .like('metadata->ip_address', `%${context.ipAddress}%`)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      const failureCount = recentFailures?.length || 0;

      if (failureCount >= 5) {
        await this.logEvent('error', 'security', 
          `Brute force attack detected from IP ${context.ipAddress}`, {
            ...context,
            action: 'brute_force_detection',
            metadata: {
              ...context.metadata,
              failure_count: failureCount,
              detection_window: '1_hour'
            }
          }
        );
      }
    } catch (error) {
      console.error('Error checking brute force pattern:', error);
    }
  }

  // Message generators
  private getAuthMessage(type: string, context: SecurityEventContext): string {
    switch (type) {
      case 'login_success': return `Successful login for user`;
      case 'login_failed': return `Failed login attempt from ${context.ipAddress || 'unknown IP'}`;
      case 'logout': return `User logout`;
      case 'password_reset': return `Password reset requested`;
      default: return `Authentication event: ${type}`;
    }
  }

  private getBehaviorMessage(type: string, context: SecurityEventContext): string {
    const count = context.metadata?.count || 'multiple';
    switch (type) {
      case 'bulk_creation': return `Bulk sensor creation detected: ${count} sensors`;
      case 'rapid_updates': return `Rapid profile updates detected: ${count} updates`;
      case 'unusual_pattern': return `Unusual user behavior pattern detected`;
      case 'suspicious_activity': return `Suspicious user activity detected`;
      default: return `Behavior event: ${type}`;
    }
  }

  private getDataAccessMessage(type: string, context: SecurityEventContext): string {
    switch (type) {
      case 'bulk_read': return `Bulk data access detected`;
      case 'unauthorized_access': return `Unauthorized data access attempt`;
      case 'data_export': return `Data export operation performed`;
      case 'admin_action': return `Administrative action performed: ${context.action}`;
      default: return `Data access event: ${type}`;
    }
  }

  private getSystemMessage(type: string, _context: SecurityEventContext): string {
    switch (type) {
      case 'security_scan': return `Security scan completed`;
      case 'policy_violation': return `Security policy violation detected`;
      case 'system_error': return `System security error occurred`;
      case 'maintenance': return `Security maintenance operation`;
      default: return `System event: ${type}`;
    }
  }

  private getBehaviorSeverity(type: string, context: SecurityEventContext): 'info' | 'warn' | 'error' {
    const count = context.metadata?.count || 0;
    
    switch (type) {
      case 'bulk_creation':
        return count > 10 ? 'error' : count > 5 ? 'warn' : 'info';
      case 'rapid_updates':
        return count > 10 ? 'warn' : 'info';
      case 'unusual_pattern':
      case 'suspicious_activity':
        return 'warn';
      default:
        return 'info';
    }
  }
}

export const securityEventLogger = SecurityEventLogger.getInstance();