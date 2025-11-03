-- Setup automatic Dexcom token refresh using pg_cron
-- This script should be run by a database administrator

-- Note: Ensure migration 20251101000004_fix_dexcom_sync_log_table.sql has been applied first

-- Enable the pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges and may need to be done manually
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic token refresh every 30 minutes
-- This will check for tokens expiring within 2 hours and refresh them
SELECT cron.schedule(
    'dexcom-auto-refresh',
    '*/30 * * * *', -- Every 30 minutes
    'SELECT public.trigger_dexcom_auto_refresh();'
);

-- Schedule token status monitoring every 15 minutes
-- This will check for expired tokens and clean them up
SELECT cron.schedule(
    'dexcom-token-cleanup',
    '*/15 * * * *', -- Every 15 minutes
    'SELECT public.notify_expiring_tokens();'
);

-- Schedule a summary report every 4 hours
SELECT cron.schedule(
    'dexcom-summary',
    '0 */4 * * *', -- Every 4 hours
    $$
    INSERT INTO public.dexcom_sync_log (
        user_id,
        sync_type,
        status,
        message,
        created_at
    )
    SELECT 
        NULL, -- System operation
        'daily_summary',
        'info',
        format('Daily summary: %s active tokens, %s need refresh within 24h', 
               COUNT(*) FILTER (WHERE status = 'active'),
               COUNT(*) FILTER (WHERE status IN ('expiring', 'refresh_soon'))
        ),
        NOW()
    FROM public.dexcom_token_status;
    $$
);

-- View current cron jobs
SELECT * FROM cron.job WHERE jobname LIKE 'dexcom%';

-- To remove jobs if needed (uncomment to use):
-- SELECT cron.unschedule('dexcom-auto-refresh');
-- SELECT cron.unschedule('dexcom-token-cleanup');
-- SELECT cron.unschedule('dexcom-daily-summary');