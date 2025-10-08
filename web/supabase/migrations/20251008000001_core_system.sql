-- Core System Migration
-- Contains all essential tables and basic functionality for CGM Sensor Tracker
-- Migration: 20251008000001_core_system.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create sensor_type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sensor_type') THEN
        CREATE TYPE sensor_type AS ENUM ('dexcom', 'freestyle');
    END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    avatar_url TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    dark_mode_enabled BOOLEAN DEFAULT false,
    glucose_unit TEXT DEFAULT 'mg/dL' CHECK (glucose_unit IN ('mg/dL', 'mmol/L')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sync_at TIMESTAMPTZ
);

-- Create sensors table
CREATE TABLE IF NOT EXISTS public.sensors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  lot_number TEXT,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  sensor_type sensor_type NOT NULL DEFAULT 'dexcom',
  location TEXT,
  is_problematic BOOLEAN DEFAULT FALSE NOT NULL,
  issue_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Constraints
  CONSTRAINT check_lot_number_for_dexcom 
  CHECK (
    (sensor_type = 'dexcom' AND lot_number IS NOT NULL) OR 
    (sensor_type = 'freestyle' AND lot_number IS NULL)
  )
);

-- Create sensor_models table
CREATE TABLE IF NOT EXISTS public.sensor_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model_name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manufacturer, model_name)
);

-- Create sensor_photos table
CREATE TABLE IF NOT EXISTS public.sensor_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'general' CHECK (photo_type IN ('general', 'issue', 'installation', 'removal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sensor_tags table
CREATE TABLE IF NOT EXISTS public.sensor_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sensor_id, tag_name)
);

-- Create archived_sensors table
CREATE TABLE IF NOT EXISTS public.archived_sensors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_sensor_id UUID NOT NULL,
  serial_number TEXT NOT NULL,
  lot_number TEXT,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  date_archived TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sensor_type sensor_type NOT NULL DEFAULT 'dexcom',
  location TEXT,
  was_problematic BOOLEAN DEFAULT FALSE,
  final_notes TEXT,
  archive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sensor models
INSERT INTO public.sensor_models (manufacturer, model_name, duration_days, description) VALUES
('Dexcom', 'G6', 10, 'Dexcom G6 Continuous Glucose Monitor'),
('Dexcom', 'G7', 10, 'Dexcom G7 Continuous Glucose Monitor'),
('Abbott', 'FreeStyle Libre', 14, 'Abbott FreeStyle Libre Flash Glucose Monitor'),
('Abbott', 'FreeStyle Libre 2', 14, 'Abbott FreeStyle Libre 2 with Bluetooth'),
('Medtronic', 'Guardian 3', 7, 'Medtronic Guardian 3 CGM System')
ON CONFLICT (manufacturer, model_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON public.sensors(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_date_added ON public.sensors(date_added);
CREATE INDEX IF NOT EXISTS idx_sensors_is_deleted ON public.sensors(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sensors_sensor_type ON public.sensors(sensor_type);
CREATE INDEX IF NOT EXISTS idx_sensor_photos_sensor_id ON public.sensor_photos(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_tags_sensor_id ON public.sensor_tags(sensor_id);
CREATE INDEX IF NOT EXISTS idx_archived_sensors_user_id ON public.archived_sensors(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_sensors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for sensors
CREATE POLICY "Users can view their own sensors" ON public.sensors
    FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own sensors" ON public.sensors
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own sensors" ON public.sensors
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own sensors" ON public.sensors
    FOR DELETE USING (user_id = (SELECT auth.uid()));

-- RLS Policies for sensor_models (read-only for users)
CREATE POLICY "Anyone can view sensor models" ON public.sensor_models
    FOR SELECT USING (true);

-- RLS Policies for sensor_photos
CREATE POLICY "Users can view photos of their own sensors" ON public.sensor_photos
    FOR SELECT USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can upload photos to their own sensors" ON public.sensor_photos
    FOR INSERT WITH CHECK (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update photos of their own sensors" ON public.sensor_photos
    FOR UPDATE USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete photos of their own sensors" ON public.sensor_photos
    FOR DELETE USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

-- RLS Policies for sensor_tags
CREATE POLICY "Users can view tags of their own sensors" ON public.sensor_tags
    FOR SELECT USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can add tags to their own sensors" ON public.sensor_tags
    FOR INSERT WITH CHECK (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete tags from their own sensors" ON public.sensor_tags
    FOR DELETE USING (
        sensor_id IN (
            SELECT id FROM public.sensors WHERE user_id = (SELECT auth.uid())
        )
    );

-- RLS Policies for archived_sensors
CREATE POLICY "Users can view their own archived sensors" ON public.archived_sensors
    FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own archived sensors" ON public.archived_sensors
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sensor-photos', 'sensor-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sensor-photos bucket
CREATE POLICY "Users can upload photos for their own sensors" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view photos for their own sensors" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update photos for their own sensors" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete photos for their own sensors" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON public.sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_models_updated_at BEFORE UPDATE ON public.sensor_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_photos_updated_at BEFORE UPDATE ON public.sensor_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();