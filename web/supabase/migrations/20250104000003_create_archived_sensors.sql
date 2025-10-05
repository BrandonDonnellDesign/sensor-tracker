-- Create archived_sensors table for historical data storage
-- This table stores sensors that have been archived from the main sensors table

-- Create archived_sensors table with same structure as sensors table plus metadata
CREATE TABLE public.archived_sensors (
  -- Original sensor data (same as sensors table)
  id UUID PRIMARY KEY, -- Keep original ID for reference
  user_id UUID NOT NULL, -- Keep user reference but don't enforce FK since user might be deleted
  serial_number TEXT NOT NULL,
  lot_number TEXT,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  is_problematic BOOLEAN DEFAULT FALSE NOT NULL,
  issue_notes TEXT,
  sensor_type TEXT NOT NULL DEFAULT 'dexcom',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Archival metadata
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  archived_reason TEXT DEFAULT 'expired_6_months' NOT NULL,
  original_expiry_date TIMESTAMP WITH TIME ZONE, -- Calculated expiry date when archived
  days_worn INTEGER, -- How many days the sensor was actually worn
  
  -- Additional metadata for historical tracking
  archived_by_user_id UUID, -- In case of manual archival
  notes_at_archival TEXT -- Any additional notes when archived
);

-- Create indexes for performance
CREATE INDEX idx_archived_sensors_user_id ON public.archived_sensors(user_id);
CREATE INDEX idx_archived_sensors_archived_at ON public.archived_sensors(archived_at);
CREATE INDEX idx_archived_sensors_date_added ON public.archived_sensors(date_added);
CREATE INDEX idx_archived_sensors_sensor_type ON public.archived_sensors(sensor_type);

-- Add RLS for archived sensors (users can only see their own archived data)
ALTER TABLE public.archived_sensors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own archived sensors
CREATE POLICY "Users can view their own archived sensors" ON public.archived_sensors
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Only system can insert archived sensors (not users directly)
CREATE POLICY "System can insert archived sensors" ON public.archived_sensors
  FOR INSERT WITH CHECK (false); -- Block direct inserts, only functions can insert

-- Add comments for documentation
COMMENT ON TABLE public.archived_sensors IS 'Historical storage for sensors archived from main sensors table';
COMMENT ON COLUMN public.archived_sensors.archived_reason IS 'Reason for archival: expired_6_months, manual, etc.';
COMMENT ON COLUMN public.archived_sensors.original_expiry_date IS 'Calculated expiry date based on sensor model when archived';
COMMENT ON COLUMN public.archived_sensors.days_worn IS 'Number of days sensor was worn (date_added to archive date)';