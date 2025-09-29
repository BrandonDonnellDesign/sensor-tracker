-- Dexcom Sensor Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (this might already exist from Supabase Auth)
-- If it exists, you can skip this part
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sensors table
CREATE TABLE public.sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    is_problematic BOOLEAN NOT NULL DEFAULT FALSE,
    issue_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create photos table
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    cloud_url TEXT,
    local_path TEXT,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_sensors_user_id ON public.sensors(user_id);
CREATE INDEX idx_sensors_updated_at ON public.sensors(updated_at);
CREATE INDEX idx_sensors_is_deleted ON public.sensors(is_deleted);
CREATE INDEX idx_photos_sensor_id ON public.photos(sensor_id);
CREATE INDEX idx_photos_updated_at ON public.photos(updated_at);
CREATE INDEX idx_photos_is_deleted ON public.photos(is_deleted);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sensors table
CREATE POLICY "Users can view their own sensors" ON public.sensors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensors" ON public.sensors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sensors" ON public.sensors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sensors" ON public.sensors
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for photos table
CREATE POLICY "Users can view photos of their own sensors" ON public.photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert photos for their own sensors" ON public.photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update photos of their own sensors" ON public.photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos of their own sensors" ON public.photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.sensors 
            WHERE sensors.id = photos.sensor_id 
            AND sensors.user_id = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_sensors_updated_at 
    BEFORE UPDATE ON public.sensors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at 
    BEFORE UPDATE ON public.photos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional)
-- You can uncomment this if you want some test data
/*
INSERT INTO public.sensors (user_id, serial_number, lot_number, date_added, is_problematic, issue_notes) VALUES
    (auth.uid(), 'SN123456789', 'LOT001', '2024-01-15', false, null),
    (auth.uid(), 'SN987654321', 'LOT002', '2024-01-20', true, 'Sensor failed after 3 days, adhesive came loose'),
    (auth.uid(), 'SN456789123', 'LOT001', '2024-01-25', false, null);
*/