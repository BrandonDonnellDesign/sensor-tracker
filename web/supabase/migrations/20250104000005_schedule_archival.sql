-- Set up scheduled archival using pg_cron
-- This will automatically run the archival function monthly

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the archival function to run monthly on the 1st at 2 AM UTC
-- This runs once per month to keep the main sensors table lean
SELECT cron.schedule(
  'monthly-sensor-archival',
  '0 2 1 * *', -- At 2:00 AM on the 1st day of every month
  'SELECT archive_expired_sensors();'
);

-- Optional: Schedule a more frequent check for testing (every Sunday at 3 AM)
-- You can remove this after testing or keep it for more frequent cleanup
SELECT cron.schedule(
  'weekly-sensor-archival-check',
  '0 3 * * 0', -- At 3:00 AM every Sunday
  'SELECT archive_expired_sensors();'
);

-- Create a function to manually trigger archival (for admin/testing)
CREATE OR REPLACE FUNCTION trigger_manual_archival()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
  result JSON;
BEGIN
  -- Run the archival function
  SELECT archive_expired_sensors() INTO archived_count;
  
  -- Return result
  SELECT json_build_object(
    'archived_count', archived_count,
    'triggered_at', NOW(),
    'triggered_by', auth.uid()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users (you might want to restrict this to admins only)
GRANT EXECUTE ON FUNCTION trigger_manual_archival() TO authenticated;

-- Function to view scheduled jobs
CREATE OR REPLACE FUNCTION get_archival_schedule()
RETURNS TABLE(
  jobname TEXT,
  schedule TEXT,
  command TEXT,
  active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname,
    j.schedule,
    j.command,
    j.active
  FROM cron.job j
  WHERE j.jobname LIKE '%archival%'
  ORDER BY j.jobname;
END;
$$;

-- Grant execute for viewing schedule
GRANT EXECUTE ON FUNCTION get_archival_schedule() TO authenticated;