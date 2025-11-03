// React hook for integrating security middleware into components
import { useEffect, useCallback } from 'react';
import { securityMiddleware, type SecurityContext } from '@/lib/security/security-middleware';

interface UseSecurityMiddlewareOptions {
  enableRealTimeMonitoring?: boolean;
  logUserActions?: boolean;
  enforceRateLimit?: boolean;
  validateInputs?: boolean;
}

export function useSecurityMiddleware(options: UseSecurityMiddlewareOptions = {}) {
  const {
    enableRealTimeMonitoring = true,
    logUserActions = true,
    enforceRateLimit = true,
    validateInputs = true
  } = options;

  // Security check function
  const checkSecurity = useCallback(async (context: Partial<SecurityContext>) => {
    if (!enableRealTimeMonitoring) return { allowed: true, riskScore: 0 };

    const fullContext: SecurityContext = {
      userId: context.userId || 'anonymous',
      ipAddress: context.ipAddress || getClientIP(),
      userAgent: context.userAgent || navigator.userAgent,
      action: context.action || 'unknown',
      resource: context.resource || 'unknown',
      metadata: context.metadata || {}
    };

    return await securityMiddleware.checkSecurity(fullContext);
  }, [enableRealTimeMonitoring]);

  // Log security event
  const logSecurityEvent = useCallback(async (
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, any>
  ) => {
    if (!logUserActions) return;

    try {
      await fetch('/api/admin/security-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log-security-event',
          level,
          category: 'security',
          message,
          userHash: getCurrentUserHash(),
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            page_url: window.location.href
          }
        })
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [logUserActions]);

  // Rate limit check
  const checkRateLimit = useCallback(async (
    action: string,
    limit: number = 30,
    windowMinutes: number = 60
  ) => {
    if (!enforceRateLimit) return true;

    try {
      const response = await fetch('/api/admin/security-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-rate-limit',
          userId: getCurrentUserId(),
          actionType: action,
          limit,
          windowMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.allowed;
      }
      
      return true; // Fail open
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Fail open
    }
  }, [enforceRateLimit]);

  // Input validation
  const validateInput = useCallback(async (
    input: string,
    fieldName: string,
    maxLength: number = 255
  ) => {
    if (!validateInputs) return true;

    try {
      const response = await fetch('/api/admin/security-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-input',
          input,
          fieldName,
          maxLength
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid;
      }
      
      return true; // Fail open
    } catch (error) {
      console.error('Input validation failed:', error);
      return true; // Fail open
    }
  }, [validateInputs]);

  // Secure action wrapper
  const secureAction = useCallback(async <T>(
    action: string,
    fn: () => Promise<T>,
    context?: Partial<SecurityContext>
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
      // Check security first
      const securityCheck = await checkSecurity({
        action,
        ...context
      });

      if (!securityCheck.allowed) {
        await logSecurityEvent('warn', `Action blocked: ${action}`, {
          reason: securityCheck.reason,
          risk_score: securityCheck.riskScore
        });
        
        return {
          success: false,
          error: securityCheck.reason || 'Action not allowed'
        };
      }

      // Check rate limit
      const rateLimitOk = await checkRateLimit(action);
      if (!rateLimitOk) {
        await logSecurityEvent('warn', `Rate limit exceeded for action: ${action}`);
        return {
          success: false,
          error: 'Rate limit exceeded'
        };
      }

      // Execute the action
      const result = await fn();
      
      // Log successful action
      await logSecurityEvent('info', `Action completed: ${action}`, {
        risk_score: securityCheck.riskScore
      });

      return { success: true, data: result };
    } catch (error) {
      await logSecurityEvent('error', `Action failed: ${action}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action failed'
      };
    }
  }, [checkSecurity, checkRateLimit, logSecurityEvent]);

  // Monitor page activity
  useEffect(() => {
    if (!enableRealTimeMonitoring) return;

    const handlePageActivity = () => {
      logSecurityEvent('info', 'Page activity detected', {
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logSecurityEvent('info', 'Page became visible');
      }
    };

    // Monitor user activity
    window.addEventListener('click', handlePageActivity);
    window.addEventListener('keydown', handlePageActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Log page load
    logSecurityEvent('info', 'Page loaded', {
      page: window.location.pathname,
      referrer: document.referrer
    });

    return () => {
      window.removeEventListener('click', handlePageActivity);
      window.removeEventListener('keydown', handlePageActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableRealTimeMonitoring, logSecurityEvent]);

  return {
    checkSecurity,
    logSecurityEvent,
    checkRateLimit,
    validateInput,
    secureAction
  };
}

// Helper functions
function getClientIP(): string {
  // In a real implementation, you'd get this from headers or a service
  return '0.0.0.0';
}

function getCurrentUserId(): string | undefined {
  // In a real implementation, you'd get this from your auth context
  return undefined;
}

function getCurrentUserHash(): string {
  // In a real implementation, you'd get this from your auth context
  return 'anonymous';
}