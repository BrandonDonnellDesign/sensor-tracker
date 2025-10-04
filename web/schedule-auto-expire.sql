-- Create a cron job to automatically tag expired sensors daily
-- This requires the pg_cron extension to be enabled in Supabase

-- Enable the pg_cron extension (this may need to be done in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-expire function to run daily at 6 AM UTC
-- Note: You may need to enable pg_cron in your Supabase project settings first
SELECT cron.schedule(
    'auto-tag-expired-sensors',     -- job name
    '0 6 * * *',                    -- cron expression: daily at 6 AM UTC
    'SELECT auto_tag_expired_sensors();'  -- SQL to execute
);

-- Alternative: If pg_cron is not available, you can call this function manually
-- or from your application code on a schedule

-- To manually run the expiration check:
-- SELECT auto_tag_expired_sensors();

-- To check existing cron jobs:
-- SELECT * FROM cron.job;

-- To remove the cron job if needed:
-- SELECT cron.unschedule('auto-tag-expired-sensors');