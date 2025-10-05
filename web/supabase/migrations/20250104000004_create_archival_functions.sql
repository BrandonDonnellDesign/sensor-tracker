-- Create function to archive old sensors
-- This function moves sensors that expired >6 months ago to the archived_sensors table

-- Function to archive expired sensors
CREATE OR REPLACE FUNCTION archive_expired_sensors()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sensors_to_archive CURSOR FOR
    SELECT 
      s.*,
      COALESCE(sm.duration_days, 14) as expected_duration_days,
      s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) as calculated_expiry_date
    FROM public.sensors s
    LEFT JOIN public.sensor_models sm ON sm.manufacturer = 
      CASE 
        WHEN s.sensor_type = 'dexcom' THEN 'Dexcom'
        WHEN s.sensor_type = 'freestyle' THEN 'Abbott'
        ELSE 'Dexcom'
      END
    AND sm.model_name = 
      CASE 
        WHEN s.sensor_type = 'dexcom' THEN 'G7'
        WHEN s.sensor_type = 'freestyle' THEN 'Libre 3'
        ELSE 'G7'
      END
    WHERE s.archived_at IS NULL 
    AND s.is_deleted = FALSE
    AND (s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months') < NOW();
  
  sensor_record RECORD;
  archived_count INTEGER := 0;
  days_worn INTEGER;
BEGIN
  -- Loop through sensors that need archiving
  FOR sensor_record IN sensors_to_archive LOOP
    -- Calculate days worn (from date_added to expiry date, not archive date)
    days_worn := EXTRACT(days FROM (sensor_record.calculated_expiry_date - sensor_record.date_added));
    
    -- Insert into archived_sensors table
    INSERT INTO public.archived_sensors (
      id,
      user_id,
      serial_number,
      lot_number,
      date_added,
      is_problematic,
      issue_notes,
      sensor_type,
      created_at,
      updated_at,
      synced_at,
      is_deleted,
      archived_at,
      archived_reason,
      original_expiry_date,
      days_worn,
      notes_at_archival
    ) VALUES (
      sensor_record.id,
      sensor_record.user_id,
      sensor_record.serial_number,
      sensor_record.lot_number,
      sensor_record.date_added,
      sensor_record.is_problematic,
      sensor_record.issue_notes,
      sensor_record.sensor_type,
      sensor_record.created_at,
      sensor_record.updated_at,
      sensor_record.synced_at,
      sensor_record.is_deleted,
      NOW(),
      'expired_6_months',
      sensor_record.calculated_expiry_date,
      days_worn,
      FORMAT('Auto-archived: expired %s days ago', 
        EXTRACT(days FROM (NOW() - sensor_record.calculated_expiry_date))::INTEGER)
    );
    
    -- Update original sensor with archived_at timestamp
    UPDATE public.sensors 
    SET 
      archived_at = NOW(),
      updated_at = NOW()
    WHERE id = sensor_record.id;
    
    archived_count := archived_count + 1;
  END LOOP;
  
  -- Log the archival operation
  INSERT INTO public.system_logs (
    operation,
    details,
    created_at
  ) VALUES (
    'sensor_archival',
    FORMAT('Archived %s sensors that expired >6 months ago', archived_count),
    NOW()
  );
  
  RETURN archived_count;
END;
$$;

-- Create system_logs table if it doesn't exist (for logging archival operations)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operation TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for system logs
CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON public.system_logs(operation);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);

-- Function to get archival statistics
CREATE OR REPLACE FUNCTION get_archival_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_sensors', (SELECT COUNT(*) FROM public.sensors WHERE archived_at IS NULL AND is_deleted = FALSE),
    'archived_sensors', (SELECT COUNT(*) FROM public.archived_sensors),
    'sensors_ready_for_archival', (
      SELECT COUNT(*) 
      FROM public.sensors s
      LEFT JOIN public.sensor_models sm ON sm.manufacturer = 
        CASE 
          WHEN s.sensor_type = 'dexcom' THEN 'Dexcom'
          WHEN s.sensor_type = 'freestyle' THEN 'Abbott'
          ELSE 'Dexcom'
        END
      WHERE s.archived_at IS NULL 
      AND s.is_deleted = FALSE
      AND (s.date_added + INTERVAL '1 day' * COALESCE(sm.duration_days, 14) + INTERVAL '6 months') < NOW()
    ),
    'last_archival_run', (
      SELECT created_at 
      FROM public.system_logs 
      WHERE operation = 'sensor_archival' 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users for the stats function
GRANT EXECUTE ON FUNCTION get_archival_stats() TO authenticated;