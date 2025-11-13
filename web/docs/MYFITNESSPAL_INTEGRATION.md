# MyFitnessPal Integration

This document explains how to set up and use the MyFitnessPal integration for automatic food diary synchronization.

## Features

- **Automatic Food Log Sync**: Import your food diary entries from MyFitnessPal
- **Nutrition Tracking**: Sync calories, carbs, protein, and fat data
- **Meal Timing**: Track when you ate each meal
- **Water Intake**: Monitor your hydration (optional)
- **Exercise Tracking**: Sync workout data (optional)

## Setup Instructions

### 1. Register Your Application with MyFitnessPal

1. Go to [MyFitnessPal API Portal](https://www.myfitnesspal.com/api)
2. Create a new application
3. Set the OAuth Redirect URI to:
   - Development: `http://localhost:3000/api/auth/myfitnesspal/callback`
   - Production: `https://yourdomain.com/api/auth/myfitnesspal/callback`
4. Request access to the `diary` scope
5. Save your Client ID and Client Secret

### 2. Configure Environment Variables

Copy the example file and add your credentials:

```bash
cp .env.myfitnesspal.example .env.local
```

Edit `.env.local` and add:

```env
MYFITNESSPAL_CLIENT_ID=your_client_id
MYFITNESSPAL_CLIENT_SECRET=your_client_secret
MYFITNESSPAL_REDIRECT_URI=http://localhost:3000/api/auth/myfitnesspal/callback
NEXT_PUBLIC_MYFITNESSPAL_CLIENT_ID=your_client_id
```

### 3. Run Database Migrations

Apply the MyFitnessPal integration migrations:

```bash
cd supabase
supabase db push
```

Or manually run:
- `20250113000001_add_myfitnesspal_integration.sql`
- `20250113000002_add_food_logs_external_support.sql`

### 4. Configure Netlify Scheduled Functions

The integration uses Netlify scheduled functions for automatic syncing.

**Install Netlify Functions dependencies:**

```bash
cd netlify/functions
npm install
```

**Set up environment variables in Netlify:**

1. Go to your Netlify site dashboard
2. Navigate to Site settings → Environment variables
3. Add the following variables:
   - `MYFITNESSPAL_CLIENT_ID`
   - `MYFITNESSPAL_CLIENT_SECRET`
   - `MYFITNESSPAL_REDIRECT_URI`
   - `CRON_SECRET` (generate a random secret for cron job authentication)
   - `URL` (your site URL, e.g., `https://yoursite.netlify.app`)

**Deploy:**

The scheduled functions will automatically deploy with your site:
- `myfitnesspal-sync` - Runs every 30 minutes
- `sensor-expiration-check` - Runs every 6 hours

### 5. Connect Your Account

1. Go to Settings → Integrations
2. Click "Connect MyFitnessPal"
3. Authorize the application
4. You'll be redirected back to the settings page

## Usage

### Manual Sync

1. Go to Settings → Integrations
2. Find the MyFitnessPal section
3. Click "Sync Now"
4. Your food diary will be imported

### Automatic Sync

Automatic food syncing is enabled by default and runs every 30 minutes via a cron job. The system will:

1. Check all users with active MyFitnessPal connections
2. Verify if enough time has passed since last sync (based on user's sync frequency setting)
3. Refresh expired tokens automatically
4. Sync food diary entries from the last sync date
5. Import nutrition data (calories, carbs, protein, fat)
6. Track meal timing and portions
7. Log all sync operations for monitoring

**Sync Frequency:**
- Default: Every 60 minutes per user
- Cron runs: Every 30 minutes (checks all users)
- Configurable per user in sync settings

**What Gets Synced:**
- Food diary entries (meals and snacks)
- Nutrition information (calories, macros)
- Serving sizes and quantities
- Meal timing
- Water intake (optional)
- Exercise data (optional)

### Viewing Synced Data

Synced food logs appear in:
- Dashboard → Food section
- Timeline view
- Analytics and reports

## API Endpoints

### Connect Account
```
GET /api/auth/myfitnesspal/callback?code={code}&state={user_id}
```

### Sync Data
```
POST /api/myfitnesspal/sync
```

### Get Status
```
GET /api/myfitnesspal/status
```

### Disconnect
```
POST /api/myfitnesspal/disconnect
```

## Database Schema

### myfitnesspal_tokens
Stores OAuth tokens for MyFitnessPal API access.

### myfitnesspal_sync_settings
User preferences for sync frequency and what data to sync.

### myfitnesspal_sync_log
Audit log of all sync operations.

### food_logs
Extended with `source` and `external_id` columns to track MyFitnessPal entries.

## Troubleshooting

### "Token exchange failed"
- Verify your Client ID and Client Secret are correct
- Check that the Redirect URI matches exactly what's registered
- Ensure you're using the correct API endpoint

### "Authentication failed" during sync
- Your token may have expired
- Try disconnecting and reconnecting your account
- Check the sync logs for detailed error messages

### No data syncing
- Verify you have food entries in MyFitnessPal for the date range
- Check that "Sync Food Logs" is enabled in settings
- Review the sync logs for errors

## Privacy & Security

- OAuth tokens are stored encrypted in the database
- Only you can access your MyFitnessPal data
- You can disconnect at any time
- Disconnecting does not delete previously synced data

## Rate Limits

MyFitnessPal API has rate limits:
- 150 requests per hour per user
- The sync process is optimized to stay within these limits
- Automatic sync frequency is set to respect rate limits

## Support

For issues with:
- **MyFitnessPal API**: Contact MyFitnessPal support
- **Integration bugs**: Open an issue on GitHub
- **Feature requests**: Submit via the feedback form
