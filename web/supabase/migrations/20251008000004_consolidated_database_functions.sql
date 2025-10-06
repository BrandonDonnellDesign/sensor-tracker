-- Consolidated Database Functions & Triggers Migration
-- Contains triggers, storage policies, and database functions
-- Migration: 20251008000004_consolidated_database_functions.sql

-- Consolidated storage policies for all buckets
-- This replaces multiple storage policy migrations
-- NOTE: Storage policies are skipped in local development due to permission constraints

-- Check if we're in a local environment (storage schema may not have full permissions)
DO UTF8
BEGIN
  -- Try to enable RLS on storage.objects, skip if no permission
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage.objects RLS due to insufficient privileges (likely local development)';
  END;
END UTF8;

-- Storage policies (conditional on having permissions)
DO UTF8
BEGIN
  -- Drop existing policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Sensor photos are viewable by sensor owners" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload sensor photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their sensor photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their sensor photos" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN
    -- Policies don't exist, continue
    NULL;
  END;

  -- Create storage policies (skip if no permission)
  BEGIN
    -- Avatar bucket policies
    CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');

    CREATE POLICY "Users can upload their own avatar" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY "Users can update their own avatar" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY "Users can delete their own avatar" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );

    -- Sensor photos bucket policies
    CREATE POLICY "Sensor photos are viewable by sensor owners" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'sensor-photos' AND
        (storage.foldername(name))[1] IN (
          SELECT s.id::text FROM public.sensors s WHERE s.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can upload sensor photos" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'sensor-photos' AND
        (storage.foldername(name))[1] IN (
          SELECT s.id::text FROM public.sensors s WHERE s.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can update their sensor photos" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'sensor-photos' AND
        (storage.foldername(name))[1] IN (
          SELECT s.id::text FROM public.sensors s WHERE s.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can delete their sensor photos" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'sensor-photos' AND
        (storage.foldername(name))[1] IN (
          SELECT s.id::text FROM public.sensors s WHERE s.user_id = auth.uid()
        )
      );
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage policy creation due to insufficient privileges';
  END;
END UTF8;

-- Consolidated triggers migration
-- Create trigger functions and triggers for automatic timestamp updates

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS UTF8
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
UTF8 language 'plpgsql';

-- Apply updated_at triggers to all tables that need them
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at 
  BEFORE UPDATE ON public.sensors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_photos_updated_at 
  BEFORE UPDATE ON public.sensor_photos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User creation trigger to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS UTF8
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
UTF8 LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically create notifications for expiring sensors
CREATE OR REPLACE FUNCTION create_expiring_sensor_notifications()
RETURNS TRIGGER AS UTF8
DECLARE
    sensor_record RECORD;
    expiry_date TIMESTAMP WITH TIME ZONE;
    days_until_expiry INTEGER;
BEGIN
    -- Only process if this is an INSERT or UPDATE that might affect expiry
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.date_added != NEW.date_added OR OLD.sensor_model_id != NEW.sensor_model_id)) THEN
        -- Get sensor with model info
        SELECT s.*, sm.duration_days INTO sensor_record
        FROM public.sensors s
        LEFT JOIN public.sensor_models sm ON s.sensor_model_id = sm.id
        WHERE s.id = NEW.id;

        -- Calculate expiry date
        expiry_date := sensor_record.date_added + INTERVAL '1 day' * COALESCE(sensor_record.duration_days, 14);
        
        -- Calculate days until expiry
        days_until_expiry := EXTRACT(DAY FROM (expiry_date - NOW()));
        
        -- Create notification if expiring within warning period
        IF days_until_expiry <= 3 AND days_until_expiry >= 0 THEN
            INSERT INTO public.notifications (
                user_id, 
                title, 
                message, 
                type, 
                created_at
            ) VALUES (
                sensor_record.user_id,
                'Sensor Expiring Soon',
                'Your sensor will expire in ' || days_until_expiry || ' days. Please plan to replace it.',
                'sensor_expiry_warning',
                NOW()
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
UTF8 LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notifications when sensors are added or updated
CREATE TRIGGER trigger_sensor_expiry_notifications
    AFTER INSERT OR UPDATE ON public.sensors
    FOR EACH ROW
    WHEN (NEW.is_deleted = false)
    EXECUTE FUNCTION create_expiring_sensor_notifications();
