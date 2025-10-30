# Automatic Notification Setup Guide

## Overview
This guide explains how to set up automatic sensor expiration notifications that run hourly.

## Prerequisites
- Supabase project with pg_cron extension enabled
- Edge function deployed: `hourly-notifications`
- Database configuration variables set

## Setup Steps

### 1. Deploy the Edge Function
```bash
cd web/supabase/functions
supabase functions deploy hourly-notifications
```

### 2. Set Database Configuration Variables
You need to set these configuration variables in your Supabase database so the cron job can call the edge function:

```sql
-- Set your Supabase project URL
ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- Set your service role key (keep this secret!)
ALTER DATABASE postgres SET app.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

**Important:** Replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` with your actual values from the Supabase dashboard.

### 3. Run the Migration
The migration `20241227000001_setup_notification_cron.sql` will:
- Create a cron job that runs every hour
- Call the `hourly-notifications` edge function
- Check for sensors expiring within 3 days
- Create notifications for affected users

```bash
# Apply the migration
supabase db push
```

### 4. Verify the Cron Job
Check if the cron job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'hourly-sensor-notifications';
```

You should see one row with:
- `jobname`: hourly-sensor-notifications
- `schedule`: 0 * * * * (runs every hour)
- `active`: true

### 5. Test the Notification System
You can manually trigger the edge function to test:

```bash
curl -X POST 'https://ygawcvrjnijrivcvdwrm.supabase.co/functions/v1/hourly-notifications' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Or from the Supabase SQL Editor:
```sql
SELECT cron.schedule('test-notification-now', '* * * * *', 
  $$SELECT net.http_post(
    url := 'https://ygawcvrjnijrivcvdwrm.supabase.co/functions/v1/hourly-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );$$
);

-- Wait a minute, then unschedule the test job
SELECT cron.unschedule('test-notification-now');
```

## How It Works

1. **Hourly Check**: Every hour, the cron job triggers the edge function
2. **Sensor Scan**: The function queries all active sensors and calculates expiration dates
3. **Filter**: Identifies sensors expiring within 3 days
4. **Deduplication**: Checks if users already received a notification in the last 23 hours
5. **Create Notifications**: Generates in-app notifications for affected users
6. **Template**: Uses notification templates from the database (or defaults)

## Notification Logic

- **Warning Period**: 3 days before expiration
- **Cooldown**: 23 hours between notifications per user
- **Batch Limit**: Maximum 50 users per run
- **Types**: 
  - `sensor_expiry_warning`: 1-3 days before expiration
  - `sensor_expired`: Day of or after expiration

## Troubleshooting

### Notifications Not Appearing
1. Check if the cron job is active:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'hourly-sensor-notifications';
   ```

2. Check cron job execution history:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'hourly-sensor-notifications')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

3. Check if edge function is deployed:
   ```bash
   supabase functions list
   ```

4. Verify configuration variables are set:
   ```sql
   SHOW app.supabase_url;
   SHOW app.supabase_service_role_key;
   ```

### Edge Function Errors
Check the edge function logs in Supabase Dashboard:
- Go to Edge Functions → hourly-notifications → Logs
- Look for error messages or failed invocations

### No Sensors Expiring
The function only creates notifications if:
- Sensors are expiring within 3 days
- User hasn't been notified in the last 23 hours
- Sensor is not archived or deleted

## Manual Notification Generation

If you need to manually generate notifications (for testing or catch-up):

```sql
-- Call the edge function directly
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/hourly-notifications',
  headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```

## Disabling Automatic Notifications

To temporarily disable the cron job:

```sql
-- Disable the job
SELECT cron.alter_job('hourly-sensor-notifications', enabled := false);

-- Re-enable later
SELECT cron.alter_job('hourly-sensor-notifications', enabled := true);
```

To completely remove the cron job:

```sql
SELECT cron.unschedule('hourly-sensor-notifications');
```

## User Notification Preferences

Users can control their notification preferences in Settings → Notifications:
- Enable/disable notifications
- Set warning days before expiration
- Set critical alert timing
- Choose notification delivery methods

Note: The cron job respects user preferences when creating notifications.
