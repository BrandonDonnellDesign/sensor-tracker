import { SecurityLogger, SecurityAnalyzer } from './security-logger';

// Example integration with authentication flows
export class AuthSecurity {
  
  // Call this when a user successfully logs in
  static async onSuccessfulLogin(userId: string, request?: Request): Promise<void> {
    const ipAddress = this.getClientIP(request);
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    // Check for suspicious activity
    const isSuspicious = await SecurityAnalyzer.detectSuspiciousUserActivity(userId, 24);
    
    if (isSuspicious) {
      await SecurityLogger.logSuspiciousActivity(
        userId,
        'Login from user with recent suspicious activity',
        { ipAddress, userAgent }
      );
    }
  }

  // Call this when a login attempt fails
  static async onFailedLogin(email: string, request?: Request): Promise<void> {
    const ipAddress = this.getClientIP(request);
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    await SecurityLogger.logFailedLogin(
      `email_${email.split('@')[0]}`, // Hash the email for privacy
      ipAddress,
      userAgent
    );
  }

  // Call this when an admin performs an action
  static async onAdminAction(adminId: string, action: string, targetUserId?: string): Promise<void> {
    await SecurityLogger.logAdminAction(adminId, action, targetUserId);
  }

  // Call this when sensitive data is accessed
  static async onDataAccess(userId: string, resource: string, action: string): Promise<void> {
    await SecurityLogger.logDataAccess(userId, resource, action);
  }

  // Utility to extract client IP (works with various proxy setups)
  private static getClientIP(request?: Request): string {
    if (!request) return 'unknown';
    
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }
}

// Example middleware for API routes
export function withSecurityLogging(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    const startTime = Date.now();
    
    try {
      const result = await handler(request, ...args);
      
      // Log successful API access
      const userId = request.headers.get('x-user-id'); // You'd set this in your auth middleware
      if (userId) {
        await AuthSecurity.onDataAccess(
          userId,
          new URL(request.url).pathname,
          request.method
        );
      }
      
      return result;
    } catch (error) {
      // Log API errors
      await SecurityLogger.logEvent({
        type: 'system_error',
        severity: 'high',
        message: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          url: request.url,
          method: request.method,
          responseTime: Date.now() - startTime
        }
      });
      
      throw error;
    }
  };
}

export default AuthSecurity;