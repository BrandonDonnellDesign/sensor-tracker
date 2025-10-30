# Dexcom Sync Setup Guide

There are two ways to sync Dexcom data: using the edge function or using direct database functions.

## Option 1: Direct Database Sync (Recommended - Simpler)

This approach calls the Dexcom API directly from database functions without needing an edge function.

### Setup Steps:

1. **Run the migrations:**
```bash
cd web
supabase db push
```

2. **Test manual sync:**
Go to Supabase Dashboard → SQL Editor and run:
```sql
SELECT * FROM sync_dexcom_user('your-user-id-here');
```

This will return JSON showing the sync results.

3. **Enable automatic hourly sync:**
In Supabase Dashboard → SQL Editor, run:
```sql
SELECT cron.schedule(
    'dexcom-hourly-sync',
    '0 * * * *', -- Every hour at minute 0
    $$SELECT public.sync_all_dexcom_users()$$
);
```

### How It Works:

- `sync_dexcom_user(user_id)` - Syncs one user's data
  - Fetches glucose readings from Dexcom API
  - Inserts into `glucose_readings` table
  - Automatically calls `backfill_cgm_readings()` to update recent meals/insulin
  - Returns JSON with sync results

- `sync_all_dexcom_users()` - Syncs all users with auto-sync enabled
  - Loops through users with active tokens
  - Calls `sync_dexcom_user()` for each
  - Logs results to `dexcom_sync_log`

### API Endpoint:

Users can manually trigger sync via:
```
POST /api/dexcom/sync
```

This calls `sync_dexcom_user()` for the authenticated user.

---

## Option 2: Edge Function Sync (More Complex)

This approach uses a Supabase Edge Function to handle the sync.

### Setup Steps:

1. **Deploy the edge function:**
```bash
cd web
supabase functions deploy dexcom-sync
```

2. **Set environment variables:**
In Supabase Dashboard → Edge Functions → dexcom-sync → Settings:
- `DEXCOM_API_BASE_URL` = `https://api.dexcom.com/v3`
- `SUPABASE_SERVICE_ROLE_KEY` = Your service role key from Settings → API

3. **Configure the database function:**
In Supabase Dashboard → SQL Editor:
```sql
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

4. **Enable cron job:**
The cron job in migration 20250127000002 will call the edge function hourly.

### How It Works:

- Edge function at `/functions/v1/dexcom-sync`
- Called by `sync_all_dexcom_users()` via HTTP
- Syncs glucose readings and sensor data
- Automatically calls backfill function

---

## Troubleshooting

### 401 Unauthorized Error

**Problem:** Edge function returns 401 when called from cron job.

**Solution:** Use Option 1 (Direct Database Sync) instead, or ensure:
1. Service role key is set correctly
2. Edge function is deployed
3. Environment variables are configured

### No CGM Readings on Meals

**Problem:** Meals don't show CGM readings even after sync.

**Solution:** 
1. Wait ~60 minutes after logging a meal (CGM data has delay)
2. Manually trigger backfill:
```sql
SELECT * FROM backfill_cgm_readings('your-user-id', 2);
```
3. Or use the "🔄 Update CGM" button in the timeline UI

### Token Expired

**Problem:** Sync fails with "token expired" error.

**Solution:** User needs to reconnect their Dexcom account:
1. Go to Settings → Dexcom Integration
2. Click "Reconnect Dexcom"
3. Complete OAuth flow

---

## Monitoring

### Check Sync Logs:

```sql
SELECT * FROM dexcom_sync_log 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Recent Glucose Readings:

```sql
SELECT * FROM glucose_readings
WHERE user_id = 'your-user-id'
ORDER BY system_time DESC
LIMIT 20;
```

### Check Backfill Results:

```sql
SELECT 
  id,
  logged_at,
  cgm_reading_at_meal,
  cgm_trend_at_meal,
  product_name
FROM food_logs
WHERE user_id = 'your-user-id'
  AND cgm_reading_at_meal IS NOT NULL
ORDER BY logged_at DESC
LIMIT 10;
```

---

## Recommended Setup

For most users, **Option 1 (Direct Database Sync)** is recommended because:
- Simpler setup (no edge function deployment needed)
- No service role key configuration required
- Easier to debug (all logic in database)
- Same functionality as edge function

The edge function is useful if you need:
- More complex processing logic
- Integration with external services
- Custom error handling
- Separate deployment/versioning from database
