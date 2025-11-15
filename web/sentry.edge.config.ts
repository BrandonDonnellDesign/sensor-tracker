/**
 * Sentry Edge Configuration
 * Captures errors in Edge Runtime (middleware, edge functions)
 */

import * as Sentry from '@sentry/nextjs';

const sentryConfig: any = {
  // Get DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set sample rate for performance monitoring
  tracesSampleRate: 0.1, // 10% in production

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

    return event;
  },

  // Environment
  environment: process.env.NODE_ENV,
};

// Only add release if it exists
if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
  sentryConfig.release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
}

Sentry.init(sentryConfig);
