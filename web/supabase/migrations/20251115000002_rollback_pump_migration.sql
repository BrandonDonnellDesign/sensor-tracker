-- Rollback Migration: Undo pump data migration
-- This migration removes migrated data from pump tables and restores the original state
-- ONLY RUN THIS IF YOU NEED TO ROLLBACK THE MIGRATION

-- Step 1: Remove migrated entries from pump_bolus_events
DELETE FROM pump_bolus_events
WHERE metadata->>'migrated_from' = 'insulin_logs'
OR metadata ? 'original_id';

-- Step 2: Remove migrated entries from pump_basal_events
DELETE FROM pump_basal_events
WHERE metadata->>'migrated_from' = 'insulin_logs'
OR metadata ? 'original_id';

-- Step 3: Remove migrated entries from pump_delivery_logs
DELETE FROM pump_delivery_logs
WHERE metadata->>'migrated_from' = 'insulin_logs'
OR metadata ? 'original_id';

-- Step 4: Remove the migration flag from insulin_logs
UPDATE insulin_logs
SET migrated_to_pump = FALSE
WHERE migrated_to_pump = TRUE;

-- Step 5: Drop the migration flag column
ALTER TABLE insulin_logs DROP COLUMN IF EXISTS migrated_to_pump;

-- Step 6: Drop the index
DROP INDEX IF EXISTS idx_insulin_logs_migrated;

-- Step 7: Log the rollback
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'warning',
  'pump',
  'Rolled back pump data migration',
  jsonb_build_object(
    'rollback_date', NOW(),
    'reason', 'Manual rollback executed'
  )
);

-- Note: This rollback script should only be run if there are issues with the migration
-- The original insulin_logs data is preserved, so no data is lost
