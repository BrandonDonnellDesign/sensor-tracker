# Sentry Error Monitoring Setup Guide

## What is Sentry?

Sentry is an error monitoring service that helps you:
- Track errors in production
- Get notified when errors occur
- See stack traces and context
- Monitor performance
- Replay user sessions (with privacy controls)

## Setup Steps

### 1. Create a Sentry Account

1. Go to [https://sentry.io/](https://sentry.io/)
2. Sign up for a free account
3. Create a new project
4. Select "Next.js" as the platform

### 2. Get Your DSN

After creating a project, Sentry will show you a DSN (Data Source Name). It looks like:
```
https://abc123@o123456.ingest.sentry.io/7890123
```

### 3. Add DSN to Environment Variables

Add to your `.env.local` file:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@sentry.io/project-id
```

**Important:** 
- For local development, you can skip this (Sentry is disabled in development)
- For production (Netlify), add this as an environment variable in your deployment settings

### 4. Restart Your Development Server

```bash
npm run dev
```

## Configuration

### Client-Side Monitoring
**File:** `web/sentry.client.config.ts`

Monitors errors in the browser:
- React component errors
- API call failures
- User interactions
- Session replays (with privacy)

### Server-Side Monitoring
**File:** `web/sentry.server.config.ts`

Monitors errors on the server:
- API route errors
- Database errors
- Server-side rendering errors

### Edge Runtime Monitoring
**File:** `web/sentry.edge.config.ts`

Monitors errors in Edge functions:
- Middleware errors
- Edge API routes

## Privacy & Security

### Automatic Data Sanitization

All Sentry configurations automatically remove sensitive data:

**Removed from logs:**
- Authorization headers
- Cookies
- Tokens (access_token, refresh_token, etc.)
- Passwords
- API keys
- Secrets

**Session Replay Privacy:**
- All text is masked
- All media is blocked
- Only UI interactions are recorded

### Example

**Before sanitization:**
```json
{
  "headers": {
    "authorization": "Bearer abc123token",
    "cookie": "session=xyz789"
  }
}
```

**After sanitization:**
```json
{
  "headers": {
    "authorization": "[REDACTED]",
    "cookie": "[REDACTED]"
  }
}
```

## Integration with Logger

The centralized logger automatically sends errors to Sentry:

```typescript
import { logger } from '@/lib/logger';

// This will be sent to Sentry in production
logger.error('Failed to load data', error);

// This will also be sent to Sentry
logger.warn('Unusual activity detected');

// This will NOT be sent to Sentry (dev only)
logger.debug('Debug information');
```

## Sample Rates

### Development
- **Traces:** 100% (all performance data)
- **Replays:** 100% (all sessions)

### Production
- **Traces:** 10% (to reduce costs)
- **Replays:** 10% of normal sessions
- **Error Replays:** 100% (all errors get replays)

## Ignored Errors

Certain errors are automatically ignored to reduce noise:

- Browser extension errors
- Network errors (handled separately)
- User cancelled actions
- Database connection timeouts (handled separately)

## Monitoring Dashboard

Once configured, you can:

1. **View Errors:** See all errors with stack traces
2. **Set Alerts:** Get notified via email/Slack
3. **Track Performance:** Monitor API response times
4. **Replay Sessions:** Watch what users did before an error
5. **Track Releases:** See which version has issues

## Cost

Sentry offers a free tier that includes:
- 5,000 errors per month
- 10,000 performance transactions
- 50 session replays

This is usually sufficient for small to medium applications.

## Testing Sentry

To test if Sentry is working:

```typescript
// Add this to any page temporarily
import * as Sentry from '@sentry/nextjs';

// Trigger a test error
Sentry.captureMessage('Test error from CGM Tracker');
```

Check your Sentry dashboard - you should see the error appear within seconds.

## Production Deployment

### Netlify

1. Go to your Netlify site settings
2. Navigate to "Environment variables"
3. Add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=your-dsn-here
   ```
4. Redeploy your site

### Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=your-dsn-here
   ```
4. Redeploy your site

## Troubleshooting

### Sentry not capturing errors

1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set
2. Verify you're in production mode (`NODE_ENV=production`)
3. Check browser console for Sentry initialization errors
4. Verify your DSN is correct

### Too many errors

1. Adjust sample rates in config files
2. Add more errors to `ignoreErrors` list
3. Use Sentry's filtering rules

### Privacy concerns

All sensitive data is automatically redacted. Review the `beforeSend` hooks in:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

## Best Practices

1. **Don't log sensitive data** - Use the logger's sanitization
2. **Set up alerts** - Get notified of critical errors
3. **Review errors weekly** - Fix issues proactively
4. **Use releases** - Track which version has issues
5. **Monitor performance** - Catch slow API calls

## Support

- Sentry Docs: [https://docs.sentry.io/](https://docs.sentry.io/)
- Next.js Integration: [https://docs.sentry.io/platforms/javascript/guides/nextjs/](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

**Status:** ✅ Configured and ready to use
**Required:** Optional (but highly recommended for production)
**Cost:** Free tier available
