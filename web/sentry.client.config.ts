/**
 * Sentry Client Configuration
 * Captures errors in the browser
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

  // Set sample rate for session replay
  replaysSessionSampleRate: 0.1, // 10% of sessions

  // Set sample rate for error replay
  replaysOnErrorSampleRate: 1.0, // 100% of errors

  // Configure integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // Mask all text for privacy
      blockAllMedia: true, // Block all media for privacy
    }),
  ],

  // Filter out sensitive data
  beforeSend(event: any) {
    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
        if (breadcrumb.data) {
          // Remove tokens, passwords, etc.
          const sanitized = { ...breadcrumb.data };
          Object.keys(sanitized).forEach(key => {
            if (
              key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('key')
            ) {
              sanitized[key] = '[REDACTED]';
            }
          });
          breadcrumb.data = sanitized;
        }
        return breadcrumb;
      });
    }

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

  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    // Network errors
    'NetworkError',
    'Failed to fetch',
    // User cancelled actions
    'AbortError',
    'User cancelled',
  ],

  // Environment
  environment: process.env.NODE_ENV,
};

// Only add release if it exists
if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
  sentryConfig.release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
}

Sentry.init(sentryConfig);
