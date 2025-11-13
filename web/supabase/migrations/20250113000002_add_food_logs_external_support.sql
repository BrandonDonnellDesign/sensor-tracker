-- Add external source tracking to food_logs

ALTER TABLE food_logs 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- Add index for external_id lookups
CREATE INDEX IF NOT EXISTS idx_food_logs_external_id ON food_logs(external_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_source ON food_logs(source);

-- Add comment
COMMENT ON COLUMN food_logs.source IS 'Source of the food log entry: manual, myfitnesspal, nutritionix, etc.';
COMMENT ON COLUMN food_logs.external_id IS 'Unique identifier from external source to prevent duplicates';
