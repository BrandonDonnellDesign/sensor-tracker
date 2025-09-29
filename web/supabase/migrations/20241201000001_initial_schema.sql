-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE
);

-- Create sensors table
CREATE TABLE public.sensors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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

-- Create photos table
CREATE TABLE public.photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT, -- Path in Supabase Storage
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_sensors_user_id ON public.sensors(user_id);
CREATE INDEX idx_sensors_updated_at ON public.sensors(updated_at);
CREATE INDEX idx_sensors_serial_number ON public.sensors(serial_number);
CREATE INDEX idx_photos_sensor_id ON public.photos(sensor_id);
CREATE INDEX idx_photos_updated_at ON public.photos(updated_at);

-- Create updated_at trigger function
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

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Sensors policies
CREATE POLICY "Users can view own sensors" ON public.sensors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensors" ON public.sensors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sensors" ON public.sensors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sensors" ON public.sensors
  FOR DELETE USING (auth.uid() = user_id);

-- Photos policies
CREATE POLICY "Users can view own photos" ON public.photos
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.sensors WHERE id = photos.sensor_id
    )
  );

CREATE POLICY "Users can insert own photos" ON public.photos
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.sensors WHERE id = photos.sensor_id
    )
  );

CREATE POLICY "Users can update own photos" ON public.photos
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.sensors WHERE id = photos.sensor_id
    )
  );

CREATE POLICY "Users can delete own photos" ON public.photos
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM public.sensors WHERE id = photos.sensor_id
    )
  );

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('sensor-photos', 'sensor-photos', false);

-- Storage policies for photos bucket
CREATE POLICY "Users can upload their own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sensor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );