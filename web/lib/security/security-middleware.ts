// Security middleware for automatic threat detection and prevention
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SecurityContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, any>;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  // Main security check function
  async checkSecurity(context: SecurityContext): Promise<{
    allowed: boolean;
    reason?: string;
    riskScore: number;
  }> {
    let riskScore = 0;
    const checks: string[] = [];

    try {
      // Rate limiting check
      if (context.userId) {
        const rateLimitResult = await this.checkRateLimit(context);
        if (!rateLimitResult.allowed) {
          return {
            allowed: false,
            reason: 'Rate limit exceeded',
            riskScore: 100
          };
        }
        riskScore += rateLimitResult.riskScore;
      }

      // Input validation check
      if (context.metadata) {
        const inputValidation = await this.validateInputs(context);
        if (!inputValidation.valid) {
          return {
            allowed: false,
            reason: 'Invalid input detected',
            riskScore: 100
          };
        }
        riskScore += inputValidation.riskScore;
      }

      // Behavioral analysis
      if (context.userId) {
        const behaviorAnalysis = await this.analyzeBehavior(context);
        riskScore += behaviorAnalysis.riskScore;
        
        if (behaviorAnalysis.riskScore > 70) {
          await this.logSecurityEvent('warn', 'Suspicious behavior detected', context);
        }
      }

      // IP reputation check
      if (context.ipAddress) {
        const ipAnalysis = await this.analyzeIPReputation(context);
        riskScore += ipAnalysis.riskScore;
      }

      // Final decision
      const allowed = riskScore < 80; // Threshold for blocking

      if (!allowed) {
        await this.logSecurityEvent('error', 'Security check failed - access denied', context, {
          riskScore,
          checks: checks.join(', ')
        });
      }

      const result: { allowed: boolean; reason?: string; riskScore: number } = {
        allowed,
        riskScore
      };
      
      if (!allowed) {
        result.reason = 'Security risk too high';
      }
      
      return result;

    } catch (error) {
      console.error('Security middleware error:', error);
      
      // Fail secure - deny access on error
      await this.logSecurityEvent('error', 'Security middleware error', context, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        allowed: false,
        reason: 'Security check failed',
        riskScore: 100
      };
    }
  }

  // Rate limiting check
  private async checkRateLimit(context: SecurityContext): Promise<{
    allowed: boolean;
    riskScore: number;
  }> {
    try {
      const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
        p_user_id: context.userId,
        p_action: context.action,
        p_limit: this.getRateLimit(context.action),
        p_window_minutes: 60
      });

      return {
        allowed: rateLimitOk || false,
        riskScore: rateLimitOk ? 0 : 50
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, riskScore: 10 }; // Fail open for rate limiting
    }
  }

  // Input validation
  private async validateInputs(context: SecurityContext): Promise<{
    valid: boolean;
    riskScore: number;
  }> {
    if (!context.metadata) {
      return { valid: true, riskScore: 0 };
    }

    try {
      for (const [field, value] of Object.entries(context.metadata)) {
        if (typeof value === 'string') {
          const { data: isValid } = await supabase.rpc('validate_user_input', {
            p_input: value,
            p_field_name: field,
            p_max_length: 1000
          });

          if (!isValid) {
            return { valid: false, riskScore: 100 };
          }
        }
      }

      return { valid: true, riskScore: 0 };
    } catch (error) {
      console.error('Input validation error:', error);
      return { valid: false, riskScore: 50 };
    }
  }

  // Behavioral analysis
  private async analyzeBehavior(context: SecurityContext): Promise<{
    riskScore: number;
  }> {
    try {
      const { data: analysis } = await supabase.rpc('analyze_user_security_patterns', {
        p_user_id: context.userId,
        p_hours_back: 24
      });

      if (analysis) {
        return { riskScore: analysis.risk_score || 0 };
      }

      return { riskScore: 0 };
    } catch (error) {
      console.error('Behavior analysis error:', error);
      return { riskScore: 10 };
    }
  }

  // IP reputation analysis
  private async analyzeIPReputation(context: SecurityContext): Promise<{
    riskScore: number;
  }> {
    // Simple IP analysis - in production you'd use external threat intelligence
    const suspiciousPatterns = [
      /^10\./, // Private networks (could be VPN/proxy)
      /^192\.168\./, // Private networks
      /^172\.(1[6-9]|2[0-9]|3[01])\./ // Private networks
    ];

    let riskScore = 0;

    // Check for private IP ranges (potential proxy/VPN)
    if (context.ipAddress && suspiciousPatterns.some(pattern => pattern.test(context.ipAddress!))) {
      riskScore += 10;
    }

    // Check for recent failed attempts from this IP
    try {
      const { data: recentFailures } = await supabase
        .from('system_logs')
        .select('id')
        .eq('category', 'auth')
        .eq('level', 'error')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .like('metadata->ip_address', `%${context.ipAddress}%`)
        .limit(10);

      if (recentFailures && recentFailures.length > 5) {
        riskScore += 30;
      }
    } catch (error) {
      console.error('IP reputation check error:', error);
    }

    return { riskScore };
  }

  // Get rate limit for specific actions
  private getRateLimit(action: string): number {
    const limits: Record<string, number> = {
      'sensor_create': 10,
      'sensor_update': 20,
      'sensor_delete': 5,
      'profile_update': 5,
      'photo_upload': 15,
      'login_attempt': 10,
      'password_reset': 3,
      'default': 30
    };

    return limits[action] || limits.default;
  }

  // Log security events
  private async logSecurityEvent(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: SecurityContext,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const metadata = {
        action: context.action,
        resource: context.resource,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        ...context.metadata,
        ...additionalMetadata
      };

      await supabase.rpc('log_security_event', {
        p_level: level,
        p_category: 'security',
        p_message: message,
        p_user_hash: context.userId ? `user_${context.userId.substring(0, 8)}` : 'anonymous',
        p_metadata: metadata
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Automatic threat response
  async respondToThreat(
    threatLevel: 'low' | 'medium' | 'high' | 'critical',
    context: SecurityContext,
    details: Record<string, any>
  ): Promise<void> {
    try {
      switch (threatLevel) {
        case 'critical':
          // Immediate response for critical threats
          await this.logSecurityEvent('error', 'CRITICAL THREAT DETECTED - Automatic response initiated', context, {
            threat_level: threatLevel,
            auto_response: true,
            ...details
          });
          
          // Could implement automatic IP blocking, user suspension, etc.
          break;

        case 'high':
          await this.logSecurityEvent('error', 'High-level threat detected', context, {
            threat_level: threatLevel,
            ...details
          });
          break;

        case 'medium':
          await this.logSecurityEvent('warn', 'Medium-level threat detected', context, {
            threat_level: threatLevel,
            ...details
          });
          break;

        case 'low':
          await this.logSecurityEvent('info', 'Low-level security event', context, {
            threat_level: threatLevel,
            ...details
          });
          break;
      }
    } catch (error) {
      console.error('Error in threat response:', error);
    }
  }
}

export const securityMiddleware = SecurityMiddleware.getInstance();