-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table will be created by separate migration

-- Create sensors table
CREATE TABLE public.sensors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL, -- Foreign key constraint will be added by profiles migration
  serial_number TEXT NOT NULL,
  lot_number TEXT NOT NULL,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  is_problematic BOOLEAN DEFAULT FALSE NOT NULL,
  issue_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Photos table will be created by separate sensor_photos migration

-- Create indexes for better performance
CREATE INDEX idx_sensors_user_id ON public.sensors(user_id);
CREATE INDEX idx_sensors_updated_at ON public.sensors(updated_at);
CREATE INDEX idx_sensors_serial_number ON public.sensors(serial_number);

-- Trigger functions will be created by consolidated triggers migration

-- Row Level Security (RLS) policies
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- Profiles policies will be created by separate profiles migration

-- Sensors policies
CREATE POLICY "Users can view own sensors" ON public.sensors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensors" ON public.sensors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sensors" ON public.sensors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sensors" ON public.sensors
  FOR DELETE USING (auth.uid() = user_id);

-- Storage and photos policies will be handled by separate migrations