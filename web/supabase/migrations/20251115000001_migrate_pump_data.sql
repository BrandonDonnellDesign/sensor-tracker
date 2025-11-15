-- Migration: Move pump data from insulin_logs to pump tables
-- This migration identifies pump-related entries and moves them to the appropriate pump tables

-- Step 1: Migrate bolus entries from pump to pump_bolus_events
-- Identifies pump boluses by: csv_import, omnipod, or pump_sync
INSERT INTO pump_bolus_events (
  user_id,
  timestamp,
  units,
  bolus_type,
  metadata,
  created_at
)
SELECT 
  user_id,
  taken_at as timestamp,
  units,
  CASE 
    WHEN delivery_type = 'correction' THEN 'correction'
    WHEN delivery_type = 'meal' OR meal_relation IN ('before_meal', 'with_meal', 'after_meal') THEN 'meal'
    WHEN delivery_type = 'bolus' THEN 'meal'
    ELSE 'meal'
  END as bolus_type,
  jsonb_build_object(
    'insulin_type', insulin_type,
    'insulin_name', insulin_name,
    'meal_relation', meal_relation,
    'injection_site', injection_site,
    'blood_glucose_before', blood_glucose_before,
    'blood_glucose_after', blood_glucose_after,
    'notes', notes,
    'mood', mood,
    'activity_level', activity_level,
    'logged_via', logged_via,
    'original_id', id,
    'migrated_from', 'insulin_logs'
  ) as metadata,
  created_at
FROM insulin_logs
WHERE delivery_type IN ('bolus', 'meal', 'correction')
AND (
  logged_via = 'csv_import'
  OR logged_via = 'quick_bolus'
  OR injection_site = 'omnipod'
  OR logged_via = 'pump_sync'
)
ON CONFLICT DO NOTHING;

-- Step 2: Migrate basal entries from pump to pump_basal_events
-- Identifies pump basal by: csv_import, omnipod, or pump_sync
INSERT INTO pump_basal_events (
  user_id,
  timestamp,
  basal_rate,
  duration_minutes,
  basal_type,
  metadata,
  created_at
)
SELECT 
  user_id,
  taken_at as timestamp,
  units as basal_rate,
  1440 as duration_minutes, -- 24 hours for daily totals from Glooko
  'scheduled' as basal_type,
  jsonb_build_object(
    'insulin_type', insulin_type,
    'insulin_name', insulin_name,
    'injection_site', injection_site,
    'notes', notes,
    'logged_via', logged_via,
    'is_daily_total', true,
    'original_id', id,
    'migrated_from', 'insulin_logs'
  ) as metadata,
  created_at
FROM insulin_logs
WHERE delivery_type = 'basal'
AND (
  logged_via = 'csv_import'
  OR logged_via = 'quick_bolus'
  OR injection_site = 'omnipod'
  OR logged_via = 'pump_sync'
)
ON CONFLICT DO NOTHING;

-- Step 3: Create unified delivery log entries for all pump data
INSERT INTO pump_delivery_logs (
  user_id,
  timestamp,
  amount,
  delivery_type,
  metadata,
  created_at
)
SELECT 
  user_id,
  taken_at as timestamp,
  units as amount,
  CASE 
    WHEN delivery_type = 'basal' THEN 'basal'
    WHEN delivery_type = 'correction' THEN 'bolus'
    WHEN delivery_type = 'meal' THEN 'bolus'
    WHEN delivery_type = 'bolus' THEN 'bolus'
    ELSE 'bolus'
  END as delivery_type,
  jsonb_build_object(
    'insulin_type', insulin_type,
    'insulin_name', insulin_name,
    'delivery_type_original', delivery_type,
    'meal_relation', meal_relation,
    'injection_site', injection_site,
    'blood_glucose_before', blood_glucose_before,
    'blood_glucose_after', blood_glucose_after,
    'notes', notes,
    'mood', mood,
    'activity_level', activity_level,
    'logged_via', logged_via,
    'original_id', id,
    'migrated_from', 'insulin_logs'
  ) as metadata,
  created_at
FROM insulin_logs
WHERE (
  logged_via = 'csv_import'
  OR logged_via = 'quick_bolus'
  OR injection_site = 'omnipod'
  OR logged_via = 'pump_sync'
)
ON CONFLICT DO NOTHING;

-- Step 4: Add a flag to insulin_logs to mark migrated entries (don't delete yet for safety)
ALTER TABLE insulin_logs ADD COLUMN IF NOT EXISTS migrated_to_pump BOOLEAN DEFAULT FALSE;

UPDATE insulin_logs
SET migrated_to_pump = TRUE
WHERE (
  logged_via = 'csv_import'
  OR logged_via = 'quick_bolus'
  OR injection_site = 'omnipod'
  OR logged_via = 'pump_sync'
);

-- Step 5: Create index on the new flag for performance
CREATE INDEX IF NOT EXISTS idx_insulin_logs_migrated ON insulin_logs(user_id, migrated_to_pump) 
WHERE migrated_to_pump = FALSE;

-- Step 6: Log the migration
DO $$
DECLARE
  bolus_count INT;
  basal_count INT;
  delivery_count INT;
  migrated_count INT;
BEGIN
  SELECT COUNT(*) INTO bolus_count FROM pump_bolus_events;
  SELECT COUNT(*) INTO basal_count FROM pump_basal_events;
  SELECT COUNT(*) INTO delivery_count FROM pump_delivery_logs;
  SELECT COUNT(*) INTO migrated_count FROM insulin_logs WHERE migrated_to_pump = TRUE;
  
  INSERT INTO system_logs (level, category, message, metadata)
  VALUES (
    'info',
    'pump',
    'Migrated pump data from insulin_logs to pump tables',
    jsonb_build_object(
      'bolus_events', bolus_count,
      'basal_events', basal_count,
      'delivery_logs', delivery_count,
      'insulin_logs_flagged', migrated_count,
      'migration_date', NOW()
    )
  );
END $$;

-- Add helpful comments
COMMENT ON COLUMN insulin_logs.migrated_to_pump IS 'Flag indicating this entry has been migrated to pump tables';

-- Note: We keep the original insulin_logs entries for now
-- After verifying the migration is successful, you can optionally delete them with:
-- DELETE FROM insulin_logs WHERE migrated_to_pump = TRUE;
