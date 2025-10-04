# Supabase pg_cron setup for hourly notifications
# Run this SQL in your Supabase SQL editor to set up automatic hourly notifications

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly notification check (every hour on the hour)
SELECT cron.schedule(
  'hourly-sensor-notifications',  -- job name
  '0 * * * *',                    -- cron schedule (every hour at minute 0)
  'SELECT net.http_post(
    url := ''https://ygawcvrjnijrivcvdwrm.supabase.co/functions/v1/daily-notifications'',
    headers := jsonb_build_object(
      ''Content-Type'', ''application/json'',
      ''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'')
    ),
    body := jsonb_build_object()
  );'
);

-- Alternative: Check every 30 minutes (more responsive)
-- SELECT cron.schedule(
--   'frequent-sensor-notifications',
--   '*/30 * * * *',
--   'SELECT net.http_post(
--     url := ''https://ygawcvrjnijrivcvdwrm.supabase.co/functions/v1/daily-notifications'',
--     headers := jsonb_build_object(
--       ''Content-Type'', ''application/json'',
--       ''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'')
--     ),
--     body := jsonb_build_object()
--   );'
-- );

-- View all scheduled jobs
SELECT * FROM cron.job;

-- Unschedule old daily job if it exists
-- SELECT cron.unschedule('daily-sensor-notifications');

-- Unschedule hourly job if needed
-- SELECT cron.unschedule('hourly-sensor-notifications');