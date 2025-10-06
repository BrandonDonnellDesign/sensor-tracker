-- Consolidated Core Schema Migration
-- Contains initial schema, profiles table, and sensor photos
-- Migration: 20251008000001_consolidated_core_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    timezone TEXT,
    avatar_url TEXT,
    notifications_enabled BOOLEAN DEFAULT false,
    dark_mode_enabled BOOLEAN DEFAULT false,
    glucose_unit TEXT DEFAULT 'mg/dL' CHECK (glucose_unit IN ('mg/dL', 'mmol/L')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sync_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Add foreign key constraint to sensors table now that profiles exists
ALTER TABLE public.sensors 
ADD CONSTRAINT sensors_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create sensor_photos table
CREATE TABLE public.sensor_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_description TEXT,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for sensor_photos
ALTER TABLE public.sensor_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensor_photos
CREATE POLICY "Users can view photos of their own sensors" ON public.sensor_photos
  FOR SELECT USING (
    sensor_id IN (
      SELECT id FROM public.sensors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload photos to their own sensors" ON public.sensor_photos
  FOR INSERT WITH CHECK (
    sensor_id IN (
      SELECT id FROM public.sensors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos of their own sensors" ON public.sensor_photos
  FOR UPDATE USING (
    sensor_id IN (
      SELECT id FROM public.sensors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos of their own sensors" ON public.sensor_photos
  FOR DELETE USING (
    sensor_id IN (
      SELECT id FROM public.sensors WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sensor_photos_sensor_id ON public.sensor_photos(sensor_id);
CREATE INDEX idx_sensor_photos_is_primary ON public.sensor_photos(is_primary);
