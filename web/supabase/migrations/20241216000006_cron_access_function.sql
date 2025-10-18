-- Create function to sync cron job data to system_logs table
-- This function reads from cron.job_run_details and logs entries to public.system_logs

CREATE OR REPLACE FUNCTION public.sync_cron_logs_to_system_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER  -- This is the key - allows access to cron schema
AS $$
DECLARE
  cron_record RECORD;
  log_level TEXT;
  log_message TEXT;
  log_category TEXT := 'cron';
  inserted_count INTEGER := 0;
BEGIN
  -- Check if cron schema and table exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'cron' AND table_name = 'job_run_details'
  ) THEN
    -- Return 0 if cron table doesn't exist
    RETURN 0;
  END IF;

  -- Loop through recent cron job executions that haven't been logged yet
  FOR cron_record IN
    SELECT 
      jrd.runid,
      jrd.jobid,
      jrd.command,
      jrd.status,
      jrd.return_message,
      jrd.start_time,
      jrd.end_time,
      jrd.database,
      jrd.username
    FROM cron.job_run_details jrd
    WHERE jrd.start_time >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        -- Don't log if we already have this cron job in system_logs
        SELECT 1 FROM public.system_logs 
        WHERE category = 'cron' 
        AND metadata->>'runid' = jrd.runid::text
      )
    ORDER BY jrd.start_time DESC
  LOOP
    -- Determine log level based on status
    IF cron_record.status = 'failed' OR cron_record.return_message LIKE '%error%' OR cron_record.return_message LIKE '%ERROR%' THEN
      log_level := 'error';
    ELSIF cron_record.status = 'succeeded' OR cron_record.status = 'success' THEN
      log_level := 'info';
    ELSE
      log_level := 'warn';
    END IF;

    -- Create descriptive log message
    IF cron_record.command IS NOT NULL THEN
      IF cron_record.command LIKE '%notification%' THEN
        log_message := 'Notification cron job executed: ' || COALESCE(cron_record.status, 'completed');
      ELSIF cron_record.command LIKE '%backup%' THEN
        log_message := 'Database backup cron job executed: ' || COALESCE(cron_record.status, 'completed');
      ELSIF cron_record.command LIKE '%cleanup%' THEN
        log_message := 'Cleanup cron job executed: ' || COALESCE(cron_record.status, 'completed');
      ELSIF cron_record.command LIKE '%sync%' THEN
        log_message := 'Sync cron job executed: ' || COALESCE(cron_record.status, 'completed');
      ELSIF cron_record.command LIKE '%maintenance%' THEN
        log_message := 'Maintenance cron job executed: ' || COALESCE(cron_record.status, 'completed');
      ELSE
        log_message := 'Cron job executed: ' || COALESCE(cron_record.status, 'completed');
      END IF;
    ELSE
      log_message := 'Cron job executed: ' || COALESCE(cron_record.status, 'completed');
    END IF;

    -- Add failure details if applicable
    IF cron_record.status = 'failed' AND cron_record.return_message IS NOT NULL THEN
      log_message := log_message || ' (FAILED: ' || cron_record.return_message || ')';
    ELSIF cron_record.return_message IS NOT NULL AND cron_record.return_message != '' THEN
      log_message := log_message || ' (' || cron_record.return_message || ')';
    END IF;

    -- Insert into system_logs
    INSERT INTO public.system_logs (
      level,
      category,
      message,
      user_hash,
      metadata,
      created_at
    ) VALUES (
      log_level,
      log_category,
      log_message,
      NULL, -- No user context for cron jobs
      jsonb_build_object(
        'runid', cron_record.runid,
        'jobid', cron_record.jobid,
        'command', cron_record.command,
        'status', cron_record.status,
        'return_message', cron_record.return_message,
        'start_time', cron_record.start_time,
        'end_time', cron_record.end_time,
        'database', cron_record.database,
        'username', cron_record.username
      ),
      COALESCE(cron_record.start_time, cron_record.end_time, NOW())
    );

    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return the count we managed to insert
    RETURN inserted_count;
END;
$$;

-- Create a simple function to get recent cron job run details (for testing)
CREATE OR REPLACE FUNCTION public.get_cron_job_run_details(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  runid BIGINT,
  jobid BIGINT,
  job_pid INTEGER,
  database TEXT,
  username TEXT,
  command TEXT,
  status TEXT,
  return_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if cron schema and table exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'cron' AND table_name = 'job_run_details'
  ) THEN
    -- Return empty result if cron table doesn't exist
    RETURN;
  END IF;

  -- Return cron job run details
  RETURN QUERY
  SELECT 
    jrd.runid,
    jrd.jobid,
    jrd.job_pid,
    jrd.database,
    jrd.username,
    jrd.command,
    jrd.status,
    jrd.return_message,
    jrd.start_time,
    jrd.end_time
  FROM cron.job_run_details jrd
  ORDER BY COALESCE(jrd.start_time, jrd.end_time) DESC NULLS LAST
  LIMIT limit_count;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error accessing cron data, return empty
    RETURN;
END;
$$;

-- Create function to access cron.job table
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid BIGINT,
  schedule TEXT,
  command TEXT,
  nodename TEXT,
  nodeport INTEGER,
  database TEXT,
  username TEXT,
  active BOOLEAN,
  jobname TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if cron schema and job table exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    -- Return empty result if cron job table doesn't exist
    RETURN;
  END IF;

  -- Return cron jobs
  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  ORDER BY j.jobid;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error accessing cron data, return empty
    RETURN;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_cron_logs_to_system_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_job_run_details(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.sync_cron_logs_to_system_logs() IS 'Syncs cron job execution data from cron.job_run_details to public.system_logs table';
COMMENT ON FUNCTION public.get_cron_job_run_details(INTEGER) IS 'Retrieves cron job execution details using SECURITY DEFINER to access cron schema';
COMMENT ON FUNCTION public.get_cron_jobs() IS 'Retrieves scheduled cron jobs using SECURITY DEFINER to access cron schema';