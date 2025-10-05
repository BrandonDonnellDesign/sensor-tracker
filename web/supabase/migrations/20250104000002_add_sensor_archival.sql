-- Add archival support to sensors table
-- This migration adds an archived_at column to track when sensors are archived

-- Add archived_at column to sensors table
ALTER TABLE public.sensors 
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for performance when filtering archived sensors
CREATE INDEX idx_sensors_archived_at ON public.sensors(archived_at);

-- Create index for archival queries (expired sensors that aren't archived yet)
CREATE INDEX idx_sensors_archival_lookup ON public.sensors(date_added, archived_at) 
WHERE archived_at IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.sensors.archived_at IS 'Timestamp when sensor was archived. NULL means active sensor.';