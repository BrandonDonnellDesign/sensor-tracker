-- Simplified archival system
-- Replaces overly complex archival functions

-- Simple archival function
CREATE OR REPLACE FUNCTION archive_expired_sensors()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER := 0;
BEGIN
  -- Move sensors older than 6 months to archived_sensors
  WITH sensors_to_archive AS (
    SELECT s.*, sm.duration_days
    FROM public.sensors s
    LEFT JOIN public.sensor_models sm ON s.sensor_model_id = sm.id
    WHERE s.archived_at IS NULL 
      AND s.is_deleted = FALSE
      AND s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months' < NOW()
  )
  INSERT INTO public.archived_sensors (
    id, user_id, serial_number, lot_number, date_added, 
    is_problematic, issue_notes, sensor_type, sensor_model_id,
    archived_at, archived_reason, original_expiry_date,
    days_worn, created_at, updated_at
  )
  SELECT 
    id, user_id, serial_number, lot_number, date_added,
    is_problematic, issue_notes, sensor_type, sensor_model_id,
    NOW(), 'auto_archived_after_6_months',
    date_added + INTERVAL '1 day' * COALESCE(duration_days, 14),
    COALESCE(duration_days, 14),
    created_at, updated_at
  FROM sensors_to_archive;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Mark sensors as archived (keep in original table for safety)
  UPDATE public.sensors 
  SET archived_at = NOW(), archived_reason = 'auto_archived_after_6_months'
  WHERE id IN (
    SELECT s.id FROM public.sensors s
    LEFT JOIN public.sensor_models sm ON s.sensor_model_id = sm.id
    WHERE s.archived_at IS NULL 
      AND s.is_deleted = FALSE
      AND s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months' < NOW()
  );

  RETURN archived_count;
END;
$$;

-- Simplified stats function
CREATE OR REPLACE FUNCTION get_archival_stats()
RETURNS JSON
LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'active_sensors', (SELECT COUNT(*) FROM public.sensors WHERE archived_at IS NULL AND is_deleted = FALSE),
    'archived_sensors', (SELECT COUNT(*) FROM public.archived_sensors),
    'sensors_ready_for_archival', (
      SELECT COUNT(*) FROM public.sensors s
      LEFT JOIN public.sensor_models sm ON s.sensor_model_id = sm.id
      WHERE s.archived_at IS NULL AND s.is_deleted = FALSE
        AND s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months' < NOW()
    )
  );
END;
$$;

-- Simplified manual trigger function
CREATE OR REPLACE FUNCTION trigger_manual_archival()
RETURNS JSON
LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  SELECT archive_expired_sensors() INTO archived_count;
  
  RETURN json_build_object(
    'archived_count', archived_count,
    'triggered_at', NOW(),
    'triggered_by', (SELECT auth.uid())
  );
END;
$$;

-- Simplified schedule function
CREATE OR REPLACE FUNCTION get_archival_schedule()
RETURNS TABLE(jobname TEXT, schedule TEXT, command TEXT, active BOOLEAN)
LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT j.jobname, j.schedule, j.command, j.active
  FROM cron.job j
  WHERE j.jobname LIKE '%archival%'
  ORDER BY j.jobname;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_expired_sensors() TO authenticated;
GRANT EXECUTE ON FUNCTION get_archival_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_manual_archival() TO authenticated;
GRANT EXECUTE ON FUNCTION get_archival_schedule() TO authenticated;