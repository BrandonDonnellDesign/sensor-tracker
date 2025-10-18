-- Setup automatic cron log syncing
-- This migration enables pg_cron and schedules the sync function

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing sync job (in case we're re-running)
SELECT cron.unschedule('sync-cron-logs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-cron-logs'
);

-- Schedule the sync function to run every 5 minutes
-- This will automatically sync new cron job executions to system_logs
SELECT cron.schedule(
  'sync-cron-logs',                              -- Job name
  '*/5 * * * *',                                 -- Cron schedule: every 5 minutes
  'SELECT sync_cron_logs_to_system_logs();'      -- SQL command to execute
);

-- Verify the job was created
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count 
  FROM cron.job 
  WHERE jobname = 'sync-cron-logs';
  
  IF job_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Cron sync job "sync-cron-logs" has been scheduled to run every 5 minutes';
  ELSE
    RAISE NOTICE 'WARNING: Failed to create cron sync job';
  END IF;
END $$;

-- Add a comment to document what this job does
COMMENT ON EXTENSION pg_cron IS 'Cron job scheduler - used for automatic sync of cron.job_run_details to system_logs';