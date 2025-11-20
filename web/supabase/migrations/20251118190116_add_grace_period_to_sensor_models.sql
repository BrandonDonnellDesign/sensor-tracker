-- Add grace_period_hours column to sensor_models table
ALTER TABLE sensor_models
ADD COLUMN IF NOT EXISTS grace_period_hours INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN sensor_models.grace_period_hours IS 'Grace period in hours after sensor expiration (e.g., 12 hours for Dexcom G6/G7)';

-- Update existing Dexcom models to have 12-hour grace period
UPDATE sensor_models
SET grace_period_hours = 12
WHERE (
  manufacturer ILIKE '%dexcom%' 
  OR model_name ILIKE '%g6%' 
  OR model_name ILIKE '%g7%'
)
AND grace_period_hours = 0;

-- Update FreeStyle Libre models to have 0-hour grace period (no grace period)
UPDATE sensor_models
SET grace_period_hours = 0
WHERE (
  manufacturer ILIKE '%abbott%' 
  OR manufacturer ILIKE '%freestyle%'
  OR model_name ILIKE '%libre%'
)
AND grace_period_hours IS NULL;
