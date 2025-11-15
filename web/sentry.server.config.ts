/**
 * Sentry Server Configuration
 * Captures errors on the server
 */

import * as Sentry from '@sentry/nextjs';
import { isDevelopment } from '@/lib/env-validation';

const sentryConfig: any = {
  // Get DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Only enable in production
  enabled: !isDevelopment(),

  // Set sample rate for performance monitoring
  tracesSampleRate: isDevelopment() ? 1.0 : 0.1, // 100% in dev, 10% in prod

  // Filter out sensitive data
  beforeSend(event: any) {
    // Remove sensitive data from request
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      if (headers.authorization) {
        headers.authorization = '[REDACTED]';
      }
      if (headers.cookie) {
        headers.cookie = '[REDACTED]';
      }
      event.request.headers = headers;
    }

    // Remove sensitive data from extra context
    if (event.extra) {
      const extra = { ...event.extra };
      Object.keys(extra).forEach(key => {
        if (
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')
        ) {
          extra[key] = '[REDACTED]';
        }
      });
      event.extra = extra;
    }

    return event;
  },

  // Ignore certain errors
  ignoreErrors: [
    // Database connection errors (handled separately)
    'ECONNREFUSED',
    'ETIMEDOUT',
    // User cancelled actions
    'AbortError',
  ],

  // Environment
  environment: process.env.NODE_ENV,
};

// Only add release if it exists
if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
  sentryConfig.release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
}

Sentry.init(sentryConfig);
