# Quick Start: Enable Automatic Notifications

Your automatic notification system isn't running because the cron job hasn't been set up yet. Here's how to fix it:

## What's Missing
The hourly notification edge function exists, but there's no cron job scheduled to run it automatically.

## Quick Fix (5 minutes)

### 1. Deploy the Edge Function
```bash
cd web
npx supabase functions deploy hourly-notifications
```

### 2. Configure Database Settings
Open your Supabase SQL Editor and run:

```sql
-- Set your project URL (replace YOUR_PROJECT_REF)
ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- Set your service role key (get this from Supabase Dashboard → Settings → API)
ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJhbGc...YOUR_KEY_HERE';
```

### 3. Run the Setup Script
In Supabase SQL Editor, copy and paste the contents of:
`web/scripts/setup-notifications.sql`

Or run the migration:
```bash
npx supabase db push
```

### 4. Verify It's Working
Check the cron job was created:
```sql
SELECT * FROM cron.job WHERE jobname = 'hourly-sensor-notifications';
```

You should see one active job scheduled to run every hour.

## Test It Now
To test without waiting an hour:

```sql
SELECT net.http_post(
  url := current_setting('app.supabase_url') || '/functions/v1/hourly-notifications',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
  ),
  body := '{}'::jsonb
);
```

Then check your notifications:
```sql
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

## What Happens Next
- Every hour, the system checks all active sensors
- If any sensors expire within 3 days, it creates notifications
- Users see these in the notification bell icon
- Each user gets notified at most once per 23 hours (no spam)

## Troubleshooting
If notifications still don't appear:

1. **Check edge function logs**: Supabase Dashboard → Edge Functions → hourly-notifications → Logs
2. **Check cron execution**: 
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'hourly-sensor-notifications')
   ORDER BY start_time DESC LIMIT 5;
   ```
3. **Verify sensors are expiring soon**:
   ```sql
   SELECT s.serial_number, s.date_added, sm.duration_days,
          s.date_added + (sm.duration_days || ' days')::interval as expires_at
   FROM sensors s
   JOIN sensor_models sm ON s.model_id = sm.id
   WHERE s.is_deleted = false 
     AND s.archived_at IS NULL
     AND s.date_added + (sm.duration_days || ' days')::interval <= NOW() + interval '3 days'
   ORDER BY expires_at;
   ```

## Need More Details?
See `web/docs/NOTIFICATION_SETUP.md` for the complete guide.
