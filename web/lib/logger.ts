/**
 * Centralized logging utility
 * - In development: logs everything
 * - In production: only logs errors and warnings
 * - Integrates with Sentry for error tracking
 */

// Lazy load Sentry to avoid issues in build/test environments
let Sentry: typeof import('@sentry/nextjs') | null = null;
if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
  try {
    Sentry = require('@sentry/nextjs');
  } catch (e) {
    // Sentry not available, continue without it
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    console.warn('[WARN]', ...args);
    
    // Send warnings to Sentry in production
    if (!this.isDevelopment && Sentry) {
      Sentry.captureMessage(this.formatMessage(args), 'warning');
    }
  }

  error(...args: any[]): void {
    console.error('[ERROR]', ...args);
    
    // Send errors to Sentry
    if (Sentry) {
      const error = args.find(arg => arg instanceof Error);
      if (error) {
        Sentry.captureException(error, {
          extra: {
            additionalInfo: args.filter(arg => !(arg instanceof Error)),
          },
        });
      } else {
        Sentry.captureMessage(this.formatMessage(args), 'error');
      }
    }
  }

  /**
   * Format log arguments into a string message
   */
  private formatMessage(args: any[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  /**
   * Sanitize sensitive data before logging
   * Removes tokens, passwords, and other sensitive fields
   */
  sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'access_token',
      'refresh_token',
      'secret',
      'api_key',
      'apiKey',
      'authorization',
      'cookie',
      'session',
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Log with automatic sanitization
   */
  debugSafe(message: string, data?: any): void {
    if (this.isDevelopment && data) {
      this.debug(message, this.sanitize(data));
    } else if (this.isDevelopment) {
      this.debug(message);
    }
  }

  infoSafe(message: string, data?: any): void {
    if (this.isDevelopment && data) {
      this.info(message, this.sanitize(data));
    } else if (this.isDevelopment) {
      this.info(message);
    }
  }
}

export const logger = new Logger();
