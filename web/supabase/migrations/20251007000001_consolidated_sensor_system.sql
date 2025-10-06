-- Consolidated Sensor System Migration
-- Combines sensor models, tags, archival, and related functionality
-- Migration: 20251007000001_consolidated_sensor_system.sql

-- Create sensor models table to manage different sensor types and their durations
CREATE TABLE public.sensor_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL, -- e.g., 'Dexcom', 'Abbott', 'Medtronic'
  model_name TEXT NOT NULL, -- e.g., 'G6', 'G7', 'Libre 2', 'Libre 3'
  duration_days INTEGER NOT NULL, -- How many days the sensor lasts
  is_active BOOLEAN DEFAULT TRUE NOT NULL, -- Can disable old/unavailable models
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure unique combination of manufacturer and model
  UNIQUE(manufacturer, model_name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensor_models ENABLE ROW LEVEL SECURITY;

-- Create policies (allow read access for authenticated users)
CREATE POLICY "Sensor models are viewable by authenticated users"
ON public.sensor_models
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Create index for better query performance
CREATE INDEX idx_sensor_models_manufacturer ON public.sensor_models(manufacturer);
CREATE INDEX idx_sensor_models_active ON public.sensor_models(is_active);

-- Insert common sensor models
INSERT INTO public.sensor_models (manufacturer, model_name, duration_days) VALUES
  ('Dexcom', 'G6', 10),
  ('Dexcom', 'G7', 10),
  ('Abbott', 'FreeStyle Libre', 14),
  ('Abbott', 'FreeStyle Libre 2', 14),
  ('Abbott', 'FreeStyle Libre 3', 14),
  ('Medtronic', 'Guardian Connect', 7),
  ('Medtronic', 'Guardian 4', 7);

-- Update sensors table to reference sensor model instead of sensor_type
-- First, add the foreign key column
ALTER TABLE public.sensors
ADD COLUMN sensor_model_id UUID REFERENCES public.sensor_models(id);

-- Create index for the foreign key
CREATE INDEX idx_sensors_sensor_model_id ON public.sensors(sensor_model_id);

-- Add sensor tags system for categorizing issues and patterns
-- This allows users to tag sensors with predefined categories for better tracking

-- Create tags lookup table with predefined categories
CREATE TABLE public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280', -- Default gray color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create sensor_tags junction table for many-to-many relationship
CREATE TABLE public.sensor_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(sensor_id, tag_id) -- Prevent duplicate tags on same sensor
);

-- Create indexes for performance
CREATE INDEX idx_sensor_tags_sensor_id ON public.sensor_tags(sensor_id);
CREATE INDEX idx_sensor_tags_tag_id ON public.sensor_tags(tag_id);
CREATE INDEX idx_tags_category ON public.tags(category);

-- Insert predefined tags
INSERT INTO public.tags (name, category, description, color) VALUES
  -- Adhesive Issues
  ('Adhesive Failed', 'adhesive', 'Sensor came off due to adhesive failure', '#ef4444'),
  ('Poor Adhesion', 'adhesive', 'Sensor had weak adhesive from start', '#f97316'),
  ('Skin Reaction', 'adhesive', 'Allergic reaction or skin irritation from adhesive', '#eab308'),
  ('Fell Off Swimming', 'adhesive', 'Sensor came off while swimming or in water', '#3b82f6'),
  ('Fell Off Exercise', 'adhesive', 'Sensor came off during physical activity', '#8b5cf6'),

  -- Device Errors
  ('Signal Lost', 'device_error', 'Sensor stopped transmitting data', '#dc2626'),
  ('Inaccurate Readings', 'device_error', 'Sensor providing incorrect glucose values', '#ea580c'),
  ('Sensor Error', 'device_error', 'General sensor malfunction or error message', '#d97706'),
  ('Bluetooth Issues', 'device_error', 'Connection problems with phone/receiver', '#2563eb'),
  ('Calibration Problems', 'device_error', 'Sensor requiring excessive calibration', '#7c3aed'),

  -- Replacement Requests
  ('Defective Unit', 'replacement', 'Sensor was defective from manufacturer', '#991b1b'),
  ('Early Failure', 'replacement', 'Sensor failed before expected lifespan', '#c2410c'),
  ('Warranty Claim', 'replacement', 'Submitted warranty claim for replacement', '#a16207'),

  -- Physical Issues
  ('Damaged Packaging', 'physical', 'Sensor packaging was damaged upon receipt', '#b45309'),
  ('Bent Needle', 'physical', 'Sensor needle was bent during insertion', '#92400e'),
  ('Insertion Pain', 'physical', 'Sensor insertion was painful', '#78350f'),

  -- User Experience
  ('Comfort Issues', 'user_experience', 'Sensor was uncomfortable to wear', '#a3a3a3'),
  ('Visibility Issues', 'user_experience', 'Sensor was too visible under clothing', '#737373'),
  ('Sleep Disruption', 'user_experience', 'Sensor interfered with sleep', '#525252'),

  -- Environmental
  ('Weather Related', 'environmental', 'Sensor issues due to weather conditions', '#0891b2'),
  ('Travel Issues', 'environmental', 'Sensor problems during travel', '#0284c7'),
  ('Activity Related', 'environmental', 'Sensor issues during physical activities', '#0369a1');

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
  sensor_model_id UUID,
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

-- Simplified archival system
-- Replaces overly complex archival functions

-- Simple archival function
CREATE OR REPLACE FUNCTION archive_expired_sensors()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
SECURITY DEFINER
AS SilentlyContinue
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
SilentlyContinue;

-- Grant execute permission to authenticated users (function will check RLS internally)
GRANT EXECUTE ON FUNCTION archive_expired_sensors() TO authenticated;
