# Netlify Deployment Setup

This guide covers deploying the diabetes tracker to Netlify with all integrations enabled.

## Prerequisites

- Netlify account
- GitHub repository connected to Netlify
- Supabase project set up
- Node.js 18+ installed locally

## Initial Setup

### 1. Connect Repository to Netlify

1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Base directory:** `web`

### 2. Install Netlify Plugin

The project uses `@netlify/plugin-nextjs` which is configured in `netlify.toml`.

### 3. Configure Environment Variables

Go to Site settings → Environment variables and add:

#### Required Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL
URL=https://yoursite.netlify.app

# Cron Secret (generate a random string)
CRON_SECRET=your_random_secret_here
```

#### Optional Integrations

**Dexcom:**
```
DEXCOM_CLIENT_ID=your_dexcom_client_id
DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
DEXCOM_REDIRECT_URI=https://yoursite.netlify.app/api/auth/dexcom/callback
DEXCOM_API_BASE_URL=https://api.dexcom.com/v2
```

**MyFitnessPal:**
```
MYFITNESSPAL_CLIENT_ID=your_mfp_client_id
MYFITNESSPAL_CLIENT_SECRET=your_mfp_client_secret
MYFITNESSPAL_REDIRECT_URI=https://yoursite.netlify.app/api/auth/myfitnesspal/callback
NEXT_PUBLIC_MYFITNESSPAL_CLIENT_ID=your_mfp_client_id
```

**Nutritionix (Food Search):**
```
NUTRITIONIX_APP_ID=your_nutritionix_app_id
NUTRITIONIX_API_KEY=your_nutritionix_api_key
```

**OpenAI (AI Features):**
```
OPENAI_API_KEY=your_openai_api_key
```

## Scheduled Functions

The project includes Netlify scheduled functions for automatic background tasks.

### Available Functions

1. **MyFitnessPal Sync** (`myfitnesspal-sync`)
   - Schedule: Every 30 minutes
   - Purpose: Automatically sync food diary from MyFitnessPal
   - Location: `netlify/functions/myfitnesspal-sync.ts`

2. **Sensor Expiration Check** (`sensor-expiration-check`)
   - Schedule: Every 6 hours
   - Purpose: Check for expiring CGM sensors and send notifications
   - Location: `netlify/functions/sensor-expiration-check.ts`

### Installing Function Dependencies

```bash
cd netlify/functions
npm install
```

### Testing Scheduled Functions Locally

Install Netlify CLI:
```bash
npm install -g netlify-cli
```

Run locally:
```bash
netlify dev
```

Trigger a scheduled function manually:
```bash
netlify functions:invoke myfitnesspal-sync
```

## Deployment

### Automatic Deployment

Push to your main branch and Netlify will automatically:
1. Build your Next.js application
2. Deploy the site
3. Set up scheduled functions
4. Configure redirects

### Manual Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## Post-Deployment

### 1. Verify Scheduled Functions

1. Go to Netlify dashboard → Functions
2. Check that scheduled functions are listed
3. View logs to confirm they're running

### 2. Test Integrations

**MyFitnessPal:**
1. Go to Settings → Integrations
2. Click "Connect MyFitnessPal"
3. Authorize the app
4. Click "Sync Now" to test

**Dexcom:**
1. Go to Settings → Integrations
2. Click "Connect Dexcom"
3. Authorize the app
4. Check sync status

### 3. Monitor Logs

View function logs in Netlify:
```bash
netlify functions:log myfitnesspal-sync
```

Or in the Netlify dashboard:
- Functions → Select function → View logs

## Troubleshooting

### Scheduled Functions Not Running

1. Check that `netlify.toml` is in the root of your repository
2. Verify environment variables are set correctly
3. Check function logs for errors
4. Ensure `CRON_SECRET` matches in both environment variables and function calls

### Build Failures

1. Check build logs in Netlify dashboard
2. Verify all dependencies are in `package.json`
3. Ensure Node.js version is 18+
4. Check for TypeScript errors

### Integration Issues

1. Verify redirect URIs match exactly in OAuth provider settings
2. Check that environment variables are set correctly
3. Test API endpoints manually using the test routes:
   - `/api/myfitnesspal/test`
   - `/api/dexcom/test`

## Performance Optimization

### Edge Functions

For better performance, consider using Netlify Edge Functions for:
- Authentication checks
- API rate limiting
- Geolocation-based features

### Caching

Configure caching in `netlify.toml`:

```toml
[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Security

### Environment Variables

- Never commit `.env` files
- Use Netlify's environment variable management
- Rotate secrets regularly
- Use different secrets for production and preview deployments

### CRON_SECRET

Generate a strong random secret:
```bash
openssl rand -base64 32
```

Add to Netlify environment variables and use in cron job authentication.

## Monitoring

### Set Up Notifications

1. Go to Site settings → Notifications
2. Add notifications for:
   - Deploy failures
   - Function errors
   - Performance issues

### Analytics

Enable Netlify Analytics:
1. Go to Site settings → Analytics
2. Enable analytics
3. Monitor traffic and performance

## Support

- [Netlify Documentation](https://docs.netlify.com)
- [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
